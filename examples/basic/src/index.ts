import { Effect, Layer, Console } from "effect";
import { PrismaClient } from "@prisma/client";
import { PrismaLive } from "effect-prisma/runtime";
import { DB } from "../generated/effect/index.js";

const program = Effect.gen(function* () {
  const db = yield* DB;
  
  yield* Console.log("Testing effect-prisma generator...");
  
  const userCount = yield* db.user.count();
  yield* Console.log(`Current user count: ${userCount}`);
  
  const users = yield* db.user.findMany({ take: 5 });
  yield* Console.log(`Found ${users.length} users`);
  
  return users;
});

const client = new PrismaClient();
const PrismaLayer = PrismaLive(client);
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
