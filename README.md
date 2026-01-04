# effect-prisma

Prisma generator for Effect repositories and schemas. Generates type-safe, Effect-wrapped CRUD operations for your Prisma models.

## Installation

```bash
npm install effect-prisma effect @prisma/client
# or
bun add effect-prisma effect @prisma/client
```

## Setup

Add the generator to your `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

generator effect {
  provider = "effect-prisma"
  output   = "./generated/effect"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

Run `prisma generate`:

```bash
npx prisma generate
```

## Usage

```typescript
import { Effect, Layer } from "effect";
import { PrismaClient } from "@prisma/client";
import { PrismaLive, PrismaServiceLive } from "effect-prisma/runtime";
import { DB } from "./generated/effect";

const program = Effect.gen(function* () {
  const db = yield* DB;
  
  // Create a user
  const user = yield* db.user.create({
    data: { email: "alice@example.com", name: "Alice" }
  });
  
  // Find users
  const users = yield* db.user.findMany({
    where: { email: { contains: "example" } }
  });
  
  // Count
  const count = yield* db.user.count();
  
  return { user, users, count };
});

// Create layers
const client = new PrismaClient();
const PrismaLayer = Layer.provideMerge(PrismaServiceLive, PrismaLive(client));
const AppLayer = Layer.provideMerge(DB.Default, PrismaLayer);

// Run
Effect.runPromise(
  Effect.provide(program, AppLayer).pipe(
    Effect.ensuring(Effect.sync(() => client.$disconnect()))
  )
);
```

## Generated Code

The generator creates:

### Repositories (`./generated/effect/`)

- Type-safe repository for each model with Effect-wrapped CRUD operations
- Includes: `findFirst`, `findUnique`, `findMany`, `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany`, `count`
- Custom error mapping support via optional `mapError` callback

### Schemas (`./generated/effect/schemas/`)

- Effect Schema definitions for each model (scalar fields only)
- Enum schemas for Prisma enums

### Error Types

- `PrismaNotFoundError` - find operations when record not found
- `PrismaCreateError` - create operations
- `PrismaUpdateError` - update operations  
- `PrismaDeleteError` - delete operations
- `PrismaQueryError` - general query errors (findMany, count)

## Configuration Options

```prisma
generator effect {
  provider     = "effect-prisma"
  output       = "./generated/effect"          # Repository output path
  runtimePath  = "effect-prisma/runtime"       # Import path for runtime (customize for path aliases)
  schemasOutput = "./generated/effect/schemas" # Schema output path
  scalarMappings = "{\"Json\":\"Schema.parseJson()\",\"BigInt\":\"Schema.BigInt\",\"Bytes\":\"Schema.Uint8ArrayFromBase64\"}"
}
```

`scalarMappings` accepts a JSON object (recommended) or a comma-separated list of `Type=Schema` entries. Use it to override Prisma scalar mappings without a plugin.
Defaults for `BigInt` and `Bytes` use Prisma's runtime types (`Schema.BigIntFromSelf`, `Schema.Uint8ArrayFromSelf`). If you want string encodings for JSON interchange, override them to `Schema.BigInt` and `Schema.Uint8ArrayFromBase64`.

Default scalar mappings:
- `String` → `Schema.String`
- `Int` → `Schema.Int`
- `BigInt` → `Schema.BigIntFromSelf`
- `Float` → `Schema.Number`
- `Boolean` → `Schema.Boolean`
- `DateTime` → `Schema.Date`
- `Decimal` → `PrismaDecimal`
- `Bytes` → `Schema.Uint8ArrayFromSelf`
- `Json` → `Schema.Unknown`

## API

### Runtime Exports (`effect-prisma/runtime`)

```typescript
// Prisma Client Context Tag
export class Prisma extends Context.Tag<Prisma, PrismaClient>() {}

// Simple layer wrapping existing client
export const PrismaLive: (client: PrismaClient) => Layer.Layer<Prisma>

// Scoped layer with lifecycle management
export const PrismaLiveScoped: (createClient: () => PrismaClient) => Layer.Layer<Prisma>

// Prisma Service (for transactions and fiber-local client switching)
export class PrismaService extends Context.Tag<PrismaService, PrismaServiceInternal>() {}
export const PrismaServiceLive: Layer.Layer<PrismaService, never, Prisma>

// Transaction support
export const withTransaction: <A, E, R>(
  effect: Effect<A, E, R>,
  options?: TransactionOptions
) => Effect<A, E, R | PrismaService>

export const configureTransactions: (config: Partial<TransactionConfig>) => void

// Error types
export class PrismaNotFoundError extends Schema.TaggedError<...>() {}
export class PrismaCreateError extends Schema.TaggedError<...>() {}
export class PrismaUpdateError extends Schema.TaggedError<...>() {}
export class PrismaDeleteError extends Schema.TaggedError<...>() {}
export class PrismaQueryError extends Schema.TaggedError<...>() {}

// Prisma Decimal schema for Effect
export const PrismaDecimal: Schema<string, Prisma.Decimal>
```

## Error Handling

Each repository method accepts an optional `mapError` callback:

```typescript
const user = yield* db.user.findUnique(
  { where: { id: 1 } },
  (err) => new MyCustomError(`User not found: ${err.table}`)
);
```

Prisma error codes are parsed into semantic kinds:
- `UNIQUE_CONSTRAINT` (P2002)
- `RECORD_NOT_FOUND` (P2025)
- `FOREIGN_KEY_CONSTRAINT` (P2003)
- `NULL_CONSTRAINT` (P2011)
- `VALIDATION_ERROR` (P2006, P2012)
- `RELATION_VIOLATION` (P2014)

## Transactions

Wrap multiple operations in a transaction using `withTransaction`:

```typescript
import { withTransaction } from "effect-prisma/runtime";

const createOrderWithItems = (order: OrderData, items: ItemData[]) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* DB;
      const created = yield* db.order.create({ data: order });
      yield* db.orderItem.createMany({
        data: items.map(item => ({ ...item, orderId: created.id }))
      });
      return created;
    })
  );
```

Transactions automatically:
- Retry on deadlocks and serialization errors (P2034)
- Detect nested `withTransaction` calls and reuse the existing transaction
- Preserve domain error types through rollback
- Use fiber-local client switching (repositories automatically use the transaction client)

### Transaction Options

```typescript
withTransaction(effect, {
  isolationLevel: "Serializable",
  timeout: 30000,
  maxWait: 5000,
  mapError: (e) => new MyError(e),
  retryPolicy: customSchedule,
});
```

| Option | Description |
|--------|-------------|
| `isolationLevel` | Prisma isolation level (`ReadUncommitted`, `ReadCommitted`, `RepeatableRead`, `Serializable`, `Snapshot`) |
| `timeout` | Transaction timeout in milliseconds |
| `maxWait` | Maximum time to wait for a connection from the pool |
| `mapError` | Transform `PrismaError` to a custom error type |
| `retryPolicy` | Custom Effect `Schedule` for retry behavior |

### Global Configuration

```typescript
import { configureTransactions } from "effect-prisma/runtime";

configureTransactions({
  retries: 5,
  baseDelay: 100,
});
```

| Config | Default | Description |
|--------|---------|-------------|
| `retries` | 3 | Number of retry attempts for retryable errors |
| `baseDelay` | 50 | Base delay in milliseconds for exponential backoff |

## License

MIT
