import { describe, expect, test, mock } from "bun:test";
import { Effect, Layer, Exit } from "effect";
import type { PrismaClient } from "@prisma/client";
import {
  Prisma,
  PrismaLive,
  PrismaLiveScoped,
  PrismaError,
  createExec,
  PrismaService,
  PrismaServiceLive,
} from "../../src/runtime/prisma-client.js";

function createMockPrismaClient(
  overrides: Partial<PrismaClient> = {}
): PrismaClient {
  return {
    $connect: mock(() => Promise.resolve()),
    $disconnect: mock(() => Promise.resolve()),
    ...overrides,
  } as unknown as PrismaClient;
}

describe("Prisma Context.Tag", () => {
  test("can be used in Effect.gen", async () => {
    const mockClient = createMockPrismaClient();
    const layer = PrismaLive(mockClient);

    const program = Effect.gen(function* () {
      const client = yield* Prisma;
      return client;
    });

    const result = await Effect.runPromise(Effect.provide(program, layer));
    expect(result).toBe(mockClient);
  });
});

describe("PrismaLive", () => {
  test("creates Layer successfully", () => {
    const mockClient = createMockPrismaClient();
    const layer = PrismaLive(mockClient);
    expect(layer).toBeDefined();
  });

  test("provides client to effect", async () => {
    const mockClient = createMockPrismaClient();
    const layer = PrismaLive(mockClient);

    const program = Effect.gen(function* () {
      return yield* Prisma;
    });

    const result = await Effect.runPromise(Effect.provide(program, layer));
    expect(result).toBe(mockClient);
  });

  test("client is same instance (no transformation)", async () => {
    const mockClient = createMockPrismaClient();
    const layer = PrismaLive(mockClient);

    const program = Effect.gen(function* () {
      const client1 = yield* Prisma;
      const client2 = yield* Prisma;
      return { client1, client2 };
    });

    const { client1, client2 } = await Effect.runPromise(
      Effect.provide(program, layer)
    );
    expect(client1).toBe(mockClient);
    expect(client2).toBe(mockClient);
  });
});

describe("PrismaLiveScoped", () => {
  test("calls createClient factory function", async () => {
    const mockClient = createMockPrismaClient();
    const createClient = mock(() => mockClient);

    const layer = PrismaLiveScoped(createClient);

    const program = Effect.gen(function* () {
      return yield* Prisma;
    });

    await Effect.runPromise(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(createClient).toHaveBeenCalledTimes(1);
  });

  test("calls $connect on acquisition", async () => {
    const connectMock = mock(() => Promise.resolve());
    const mockClient = createMockPrismaClient({
      $connect: connectMock,
    });

    const layer = PrismaLiveScoped(() => mockClient);

    const program = Effect.gen(function* () {
      return yield* Prisma;
    });

    await Effect.runPromise(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  test("calls $disconnect on scope finalization", async () => {
    const disconnectMock = mock(() => Promise.resolve());
    const mockClient = createMockPrismaClient({
      $disconnect: disconnectMock,
    });

    const layer = PrismaLiveScoped(() => mockClient);

    const program = Effect.gen(function* () {
      yield* Prisma;
      return "done";
    });

    await Effect.runPromise(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  test("handles connection error", async () => {
    const connectionError = new Error("Connection failed");
    const mockClient = createMockPrismaClient({
      $connect: mock(() => Promise.reject(connectionError)),
    });

    const layer = PrismaLiveScoped(() => mockClient);

    const program = Effect.gen(function* () {
      return yield* Prisma;
    });

    const exit = await Effect.runPromiseExit(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("disconnect is called on scope finalization", async () => {
    const disconnectMock = mock(() => Promise.resolve());
    const mockClient = createMockPrismaClient({
      $disconnect: disconnectMock,
    });

    const layer = PrismaLiveScoped(() => mockClient);

    const program = Effect.gen(function* () {
      yield* Prisma;
      return "success";
    });

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, layer))
    );

    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(result).toBe("success");
  });
});

describe("PrismaError", () => {
  test("has _tag of PrismaError", () => {
    const error = new PrismaError(new Error("test"));
    expect(error._tag).toBe("PrismaError");
  });

  test("message from Error cause", () => {
    const cause = new Error("original message");
    const error = new PrismaError(cause);
    expect(error.message).toBe("original message");
  });

  test("message from non-Error cause", () => {
    const error = new PrismaError("string error");
    expect(error.message).toBe("string error");
  });

  test("stores original cause", () => {
    const cause = { code: "P2002", message: "Unique constraint" };
    const error = new PrismaError(cause);
    expect(error.cause).toBe(cause);
  });

  test("name is PrismaError", () => {
    const error = new PrismaError(null);
    expect(error.name).toBe("PrismaError");
  });

  test("is instance of Error", () => {
    const error = new PrismaError("test");
    expect(error instanceof Error).toBe(true);
  });
});

describe("createExec", () => {
  test("returns Effect with result on success", async () => {
    const mockClient = createMockPrismaClient();
    const exec = createExec(mockClient);

    const expectedResult = { id: 1, name: "Test" };
    const effect = exec(() => Promise.resolve(expectedResult));

    const result = await Effect.runPromise(effect);
    expect(result).toEqual(expectedResult);
  });

  test("calls errCallback on error", async () => {
    const mockClient = createMockPrismaClient();
    const exec = createExec(mockClient);

    const originalError = new Error("DB Error");
    const customError = new Error("Custom Error");
    const errCallback = mock(() => customError);

    const effect = exec(() => Promise.reject(originalError), errCallback);

    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
    expect(errCallback).toHaveBeenCalledWith(originalError);
  });

  test("returns PrismaError when no errCallback", async () => {
    const mockClient = createMockPrismaClient();
    const exec = createExec(mockClient);

    const originalError = new Error("DB Error");
    const effect = exec(() => Promise.reject(originalError));

    const exit = await Effect.runPromiseExit(effect);

    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("async function works correctly", async () => {
    const mockClient = createMockPrismaClient();
    const exec = createExec(mockClient);

    const effect = exec(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "async result";
    });

    const result = await Effect.runPromise(effect);
    expect(result).toBe("async result");
  });

  test("client passed to function correctly", async () => {
    const mockClient = createMockPrismaClient();
    const exec = createExec(mockClient);

    let receivedClient: PrismaClient | null = null;
    const effect = exec((db) => {
      receivedClient = db;
      return Promise.resolve("done");
    });

    await Effect.runPromise(effect);
    expect(receivedClient).toBe(mockClient);
  });
});

describe("PrismaService", () => {
  test("can be used with PrismaServiceLive", async () => {
    const mockClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mockClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    const program = Effect.gen(function* () {
      const service = yield* PrismaService;
      return service;
    });

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, serviceLayer))
    );

    expect(result).toBeDefined();
    expect(result.client).toBe(mockClient);
  });
});

describe("PrismaServiceLive", () => {
  test("requires Prisma dependency", async () => {
    const mockClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mockClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    const program = Effect.gen(function* () {
      return yield* PrismaService;
    });

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, serviceLayer))
    );

    expect(result).toBeDefined();
  });

  test("provides exec function", async () => {
    const mockClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mockClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    const program = Effect.gen(function* () {
      const service = yield* PrismaService;
      return typeof service.exec;
    });

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, serviceLayer))
    );

    expect(result).toBe("function");
  });

  test("provides withClient function", async () => {
    const mockClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mockClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    const program = Effect.gen(function* () {
      const service = yield* PrismaService;
      return typeof service.withClient;
    });

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, serviceLayer))
    );

    expect(result).toBe("function");
  });

  test("provides client property", async () => {
    const mockClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mockClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    const program = Effect.gen(function* () {
      const service = yield* PrismaService;
      return service.client;
    });

    const result = await Effect.runPromise(
      Effect.scoped(Effect.provide(program, serviceLayer))
    );

    expect(result).toBe(mockClient);
  });

  test("exec uses current client", async () => {
    const mockClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mockClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    let usedClient: PrismaClient | null = null;

    const program = Effect.gen(function* () {
      const service = yield* PrismaService;
      return yield* service.exec((db) => {
        usedClient = db;
        return Promise.resolve("done");
      });
    });

    await Effect.runPromise(Effect.scoped(Effect.provide(program, serviceLayer)));

    expect(usedClient).toBe(mockClient);
  });

  test("withClient changes client locally", async () => {
    const mainClient = createMockPrismaClient();
    const otherClient = createMockPrismaClient();
    const prismaLayer = PrismaLive(mainClient);
    const serviceLayer = Layer.provide(PrismaServiceLive, prismaLayer);

    const clientsUsed: PrismaClient[] = [];

    const program = Effect.gen(function* () {
      const service = yield* PrismaService;

      yield* service.exec((db) => {
        clientsUsed.push(db);
        return Promise.resolve();
      });

      yield* service.withClient(
        otherClient,
        service.exec((db) => {
          clientsUsed.push(db);
          return Promise.resolve();
        })
      );

      yield* service.exec((db) => {
        clientsUsed.push(db);
        return Promise.resolve();
      });

      return "done";
    });

    await Effect.runPromise(Effect.scoped(Effect.provide(program, serviceLayer)));

    expect(clientsUsed[0]).toBe(mainClient);
    expect(clientsUsed[1]).toBe(otherClient);
    expect(clientsUsed[2]).toBe(mainClient);
  });
});
