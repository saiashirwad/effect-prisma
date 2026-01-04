import type { PrismaClient } from "@prisma/client";
import { Context, Effect, FiberRef, Layer, pipe } from "effect";

export class Prisma extends Context.Tag("effect-prisma/Prisma")<
  Prisma,
  PrismaClient
>() {}

export const PrismaLive = (client: PrismaClient): Layer.Layer<Prisma> =>
  Layer.succeed(Prisma, client);

export const PrismaLiveScoped = (
  createClient: () => PrismaClient
): Layer.Layer<Prisma> =>
  Layer.scoped(
    Prisma,
    Effect.acquireRelease(
      pipe(
        Effect.sync(createClient),
        Effect.tap((client) => Effect.promise(() => client.$connect())),
        Effect.tap(() => Effect.logDebug("Prisma connected"))
      ),
      (client) =>
        pipe(
          Effect.promise(() => client.$disconnect()),
          Effect.tap(() => Effect.logDebug("Prisma disconnected")),
          Effect.catchAllCause(() => Effect.void)
        )
    )
  );

export class PrismaError extends Error {
  readonly _tag = "PrismaError" as const;
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "PrismaError";
    this.cause = cause;
  }
}

export interface PrismaServiceInternal {
  readonly client: PrismaClient;
  readonly exec: <A, Err extends Error>(
    f: (db: PrismaClient) => Promise<A>,
    errCallback?: (cause: unknown) => Err
  ) => Effect.Effect<A, Err | PrismaError>;
  readonly withClient: <A, E, R>(
    client: PrismaClient,
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R>;
}

export class PrismaService extends Context.Tag("effect-prisma/PrismaService")<
  PrismaService,
  PrismaServiceInternal
>() {}

// Marker to indicate we're inside a transaction
export class TxMarker extends Context.Tag("effect-prisma/TxMarker")<
  TxMarker,
  true
>() {}

const toPrismaError = (cause: unknown) => new PrismaError(cause);

export function createExec(client: PrismaClient) {
  return <A, Err extends Error>(
    f: (db: PrismaClient) => Promise<A>,
    errCallback?: (cause: unknown) => Err
  ): Effect.Effect<A, Err | PrismaError> =>
    Effect.tryPromise({
      try: () => f(client),
      catch: (cause) => (errCallback ? errCallback(cause) : toPrismaError(cause)),
    });
}

export const PrismaServiceLive = Layer.scoped(
  PrismaService,
  Effect.gen(function* () {
    const client = yield* Prisma;
    const currentClientRef = yield* FiberRef.make(client);

    const exec = <A, Err extends Error>(
      f: (db: PrismaClient) => Promise<A>,
      errCallback?: (cause: unknown) => Err
    ): Effect.Effect<A, Err | PrismaError> =>
      Effect.flatMap(FiberRef.get(currentClientRef), (c) =>
        Effect.tryPromise({
          try: () => f(c),
          catch: (cause) => (errCallback ? errCallback(cause) : toPrismaError(cause)),
        })
      );

    const withClient = <A, E, R>(
      c: PrismaClient,
      eff: Effect.Effect<A, E, R>
    ): Effect.Effect<A, E, R> => Effect.locally(eff, currentClientRef, c);

    return { client, exec, withClient } satisfies PrismaServiceInternal;
  })
);
