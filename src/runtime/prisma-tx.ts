import type { PrismaClient } from "@prisma/client";
import {
  Effect,
  Context,
  Exit,
  Cause,
  Data,
  Schedule,
  Duration,
  pipe,
} from "effect";

import { PrismaService, PrismaError, TxMarker } from "./prisma-client.js";

class DomainError<E> extends Data.TaggedError("DomainError")<{
  readonly error: E;
}> {}

export interface TransactionConfig {
  retries: number;
  baseDelay: number;
}

const defaultConfig: TransactionConfig = {
  retries: 3,
  baseDelay: 50,
};

let globalConfig = { ...defaultConfig };

export const configureTransactions = (
  config: Partial<TransactionConfig>
): void => {
  globalConfig = { ...globalConfig, ...config };
};

export const getTransactionConfig = (): TransactionConfig => ({
  ...globalConfig,
});

export interface TransactionOptions<E2 = never> {
  mapError?: (e: PrismaError) => E2;
  retryPolicy?: Schedule.Schedule<unknown, unknown, never>;
  isolationLevel?: string;
  timeout?: number;
  maxWait?: number;
}

const isPrismaRequestError = (e: unknown): boolean => {
  if (typeof e !== "object" || e === null) return false;
  const name = (e as { name?: string }).name;
  return (
    name === "PrismaClientKnownRequestError" ||
    name === "PrismaClientUnknownRequestError"
  );
};

const isRetryablePrismaError = (e: unknown): boolean => {
  if (typeof e !== "object" || e === null) return false;
  const code = (e as { code?: string }).code;
  const message = String((e as { message?: string }).message ?? "");
  return (
    code === "P2034" ||
    /serialization|deadlock/i.test(message) ||
    /could not serialize access/i.test(message)
  );
};

const isPrismaValidationError = (e: unknown): boolean => {
  if (typeof e !== "object" || e === null) return false;
  return (e as { name?: string }).name === "PrismaClientValidationError";
};

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export const withTransaction = <A, E, R, E2 = never>(
  effect: Effect.Effect<A, E, R>,
  options?: TransactionOptions<E2>
): Effect.Effect<A, E | E2, Exclude<R, TxMarker> | PrismaService> =>
  Effect.gen(function* () {
    const prismaService = yield* PrismaService;
    const ctx = yield* Effect.context<R>();

    const retry =
      options?.retryPolicy ??
      Schedule.exponential(Duration.millis(globalConfig.baseDelay)).pipe(
        Schedule.jittered,
        Schedule.compose(Schedule.recurs(globalConfig.retries))
      );

    const alreadyInTransaction =
      Context.getOption(ctx, TxMarker)._tag === "Some";
    if (alreadyInTransaction) {
      yield* Effect.logDebug("Already in transaction, running directly");
      return yield* effect;
    }

    const runTransaction = Effect.async<A, E | PrismaError>((resume) => {
      (async () => {
        try {
          const txOptions: {
            isolationLevel?: string;
            timeout?: number;
            maxWait?: number;
          } = {};
          if (options?.isolationLevel !== undefined) {
            txOptions.isolationLevel = options.isolationLevel;
          }
          if (options?.timeout !== undefined) {
            txOptions.timeout = options.timeout;
          }
          if (options?.maxWait !== undefined) {
            txOptions.maxWait = options.maxWait;
          }

          const value = await (prismaService.client.$transaction as Function)(
            async (tx: TransactionClient) => {
              const exit = await Effect.runPromiseExit(
                prismaService.withClient(
                  tx as PrismaClient,
                  pipe(
                    effect,
                    Effect.provide(ctx),
                    Effect.provideService(TxMarker, true),
                    Effect.provideService(PrismaService, prismaService)
                  )
                ) as Effect.Effect<A, E>
              );

              return Exit.match(exit, {
                onFailure: (cause) => {
                  const failureOr = Cause.failureOrCause(cause);
                  if (failureOr._tag === "Left") {
                    throw new DomainError({ error: failureOr.left });
                  }
                  throw failureOr.right;
                },
                onSuccess: (val) => val,
              });
            },
            txOptions
          );

          resume(Effect.succeed(value as A));
        } catch (err) {
          if (err instanceof DomainError) {
            resume(Effect.fail(err.error as E));
          } else if (isPrismaRequestError(err) || isPrismaValidationError(err)) {
            resume(Effect.fail(new PrismaError(err as Error)));
          } else if (Cause.isCause(err)) {
            resume(Effect.failCause(err as Cause.Cause<E>));
          } else {
            resume(Effect.die(err));
          }
        }
      })();
    });

    return yield* pipe(
      runTransaction,
      Effect.retry({
        schedule: retry,
        while: (err) =>
          err instanceof PrismaError &&
          isPrismaRequestError(err.cause) &&
          isRetryablePrismaError(err.cause),
      }),
      Effect.catchIf(
        (err): err is PrismaError =>
          err instanceof PrismaError && options?.mapError !== undefined,
        (err) => Effect.fail(options!.mapError!(err))
      )
    );
  }) as Effect.Effect<A, E | E2, Exclude<R, TxMarker> | PrismaService>;
