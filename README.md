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
import { PrismaLive } from "effect-prisma/runtime";
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
const PrismaLayer = PrismaLive(client);
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
}
```

## API

### Runtime Exports (`effect-prisma/runtime`)

```typescript
// Prisma Client Context Tag
export class Prisma extends Context.Tag<Prisma, PrismaClient>() {}

// Simple layer wrapping existing client
export const PrismaLive: (client: PrismaClient) => Layer.Layer<Prisma>

// Scoped layer with lifecycle management
export const PrismaLiveScoped: (createClient: () => PrismaClient) => Layer.Layer<Prisma>

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

## License

MIT
