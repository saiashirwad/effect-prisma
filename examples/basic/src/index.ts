import { Effect, Layer, Console } from "effect";
import { PrismaClient } from "@prisma/client";
import { PrismaLive, PrismaServiceLive, withTransaction } from "effect-prisma/runtime";
import { DB } from "../generated/effect/index.js";

const program = Effect.gen(function* () {
  const db = yield* DB;
  
  yield* Console.log("Testing effect-prisma generator...");
  
  const userCount = yield* db.user.count();
  yield* Console.log(`Current user count: ${userCount}`);
  
  const users = yield* db.user.findMany({ take: 5 });
  yield* Console.log(`Found ${users.length} users`);
  
  yield* Console.log("\nTesting transaction...");
  const result = yield* withTransaction(
    Effect.gen(function* () {
      const user = yield* db.user.create({
        data: { email: `tx-test-${Date.now()}@example.com`, name: "TX Test" },
      });
      const post = yield* db.post.create({
        data: { title: "Transaction Test Post", authorId: user.id },
      });
      yield* Console.log(`Created user ${user.id} and post ${post.id} in transaction`);
      return { user, post };
    })
  );
  
  yield* Console.log(`Transaction committed: user=${result.user.email}, post=${result.post.title}`);
  
  return users;
});

const client = new PrismaClient();
const PrismaLayer = Layer.provideMerge(PrismaServiceLive, PrismaLive(client));
const AppLayer = Layer.provideMerge(DB.Default, PrismaLayer);

Effect.runPromise(
  Effect.provide(program, AppLayer).pipe(
    Effect.ensuring(Effect.sync(() => client.$disconnect()))
  )
)
  .then((users) => {
    console.log("Success!", users);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
