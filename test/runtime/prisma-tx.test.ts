import { describe, expect, test, mock, beforeEach } from "bun:test";
import { Effect, Layer, Exit } from "effect";
import type { PrismaClient } from "@prisma/client";
import {
  Prisma,
  PrismaLive,
  PrismaService,
  PrismaServiceLive,
  PrismaError,
  TxMarker,
} from "../../src/runtime/prisma-client.js";
import {
  withTransaction,
  configureTransactions,
  getTransactionConfig,
} from "../../src/runtime/prisma-tx.js";

function createMockPrismaClient(overrides: Record<string, any> = {}): PrismaClient {
  return {
    $connect: mock(() => Promise.resolve()),
    $disconnect: mock(() => Promise.resolve()),
    $transaction: mock(async (fn: any) => fn({})),
    ...overrides,
  } as unknown as PrismaClient;
}

function createTestLayer(mockClient: PrismaClient) {
  const prismaLayer = PrismaLive(mockClient);
  return Layer.provide(PrismaServiceLive, prismaLayer);
}

describe("configureTransactions", () => {
  beforeEach(() => {
    configureTransactions({ retries: 3, baseDelay: 50 });
  });

  test("getTransactionConfig returns default values", () => {
    const config = getTransactionConfig();
    expect(config.retries).toBe(3);
    expect(config.baseDelay).toBe(50);
  });

  test("configureTransactions updates retries", () => {
    configureTransactions({ retries: 5 });
    const config = getTransactionConfig();
    expect(config.retries).toBe(5);
    expect(config.baseDelay).toBe(50);
  });

  test("configureTransactions updates baseDelay", () => {
    configureTransactions({ baseDelay: 100 });
    const config = getTransactionConfig();
    expect(config.retries).toBe(3);
    expect(config.baseDelay).toBe(100);
  });

  test("configureTransactions updates both", () => {
    configureTransactions({ retries: 10, baseDelay: 200 });
    const config = getTransactionConfig();
    expect(config.retries).toBe(10);
    expect(config.baseDelay).toBe(200);
  });
});

describe("TxMarker", () => {
  test("is a Context.Tag", () => {
    expect(TxMarker).toBeDefined();
    expect(TxMarker.key).toBe("effect-prisma/TxMarker");
  });
});

describe("withTransaction", () => {
  beforeEach(() => {
    configureTransactions({ retries: 3, baseDelay: 50 });
  });

  test("commits transaction on success", async () => {
    const transactionMock = mock(async (fn: any) => {
      return fn({});
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const program = withTransaction(Effect.succeed("result"));

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(result).toBe("result");
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  test("passes options to $transaction", async () => {
    let receivedOptions: any = null;
    const transactionMock = mock(async (fn: any, options: any) => {
      receivedOptions = options;
      return fn({});
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const program = withTransaction(Effect.succeed("result"), {
      isolationLevel: "Serializable",
      timeout: 30000,
      maxWait: 5000,
    });

    await Effect.runPromise(Effect.scoped(Effect.provide(program, layer)));

    expect(receivedOptions).toEqual({
      isolationLevel: "Serializable",
      timeout: 30000,
      maxWait: 5000,
    });
  });

  test("rolls back and propagates domain error", async () => {
    class MyError extends Error {
      readonly _tag = "MyError";
    }

    const transactionMock = mock(async (fn: any) => {
      return fn({});
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const program = withTransaction(Effect.fail(new MyError("domain error")));

    const exit = await Effect.runPromiseExit(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === "Fail" ? (exit.cause as any).error : null;
      expect(error).toBeInstanceOf(MyError);
      expect(error.message).toBe("domain error");
    }
  });

  test("nested withTransaction runs in same transaction (TxMarker)", async () => {
    let transactionCallCount = 0;
    const transactionMock = mock(async (fn: any) => {
      transactionCallCount++;
      return fn({});
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const innerEffect = withTransaction(Effect.succeed("inner"));
    const outerEffect = withTransaction(
      Effect.gen(function* () {
        const inner = yield* innerEffect;
        return `outer-${inner}`;
      })
    );

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(outerEffect, layer))
    );

    expect(result).toBe("outer-inner");
    expect(transactionCallCount).toBe(1);
  });

  test("mapError transforms PrismaError", async () => {
    class CustomError extends Error {
      readonly _tag = "CustomError";
    }

    const transactionMock = mock(async () => {
      const error = new Error("DB error");
      (error as any).name = "PrismaClientKnownRequestError";
      (error as any).code = "P2002";
      throw error;
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const program = withTransaction(Effect.succeed("result"), {
      mapError: () => new CustomError("mapped error"),
    });

    const exit = await Effect.runPromiseExit(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === "Fail" ? (exit.cause as any).error : null;
      expect(error).toBeInstanceOf(CustomError);
      expect(error.message).toBe("mapped error");
    }
  });

  test("wraps Prisma errors in PrismaError", async () => {
    const transactionMock = mock(async () => {
      const error = new Error("DB error");
      (error as any).name = "PrismaClientKnownRequestError";
      throw error;
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const program = withTransaction(Effect.succeed("result"));

    const exit = await Effect.runPromiseExit(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = exit.cause._tag === "Fail" ? (exit.cause as any).error : null;
      expect(error).toBeInstanceOf(PrismaError);
    }
  });

  test("uses fiber-local client inside transaction", async () => {
    const clientsUsed: any[] = [];
    const txClient = { isTxClient: true };

    const transactionMock = mock(async (fn: any) => {
      return fn(txClient);
    });
    const mockClient = createMockPrismaClient({
      $transaction: transactionMock,
    });
    const layer = createTestLayer(mockClient);

    const program = withTransaction(
      Effect.gen(function* () {
        const service = yield* PrismaService;
        yield* service.exec((db) => {
          clientsUsed.push(db);
          return Promise.resolve("done");
        });
        return "result";
      })
    );

    await Effect.runPromise(Effect.scoped(Effect.provide(program, layer)));

    expect(clientsUsed.length).toBe(1);
    expect(clientsUsed[0]).toEqual(txClient);
  });
});
