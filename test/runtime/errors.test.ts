import { describe, expect, test } from "bun:test";
import { Option } from "effect";
import {
  parsePrismaErrorKind,
  PrismaNotFoundError,
  PrismaCreateError,
  PrismaUpdateError,
  PrismaDeleteError,
  PrismaQueryError,
} from "../../src/runtime/errors.js";

describe("parsePrismaErrorKind", () => {
  describe("known error codes", () => {
    test("P2002 returns UNIQUE_CONSTRAINT", () => {
      expect(parsePrismaErrorKind({ code: "P2002" })).toBe("UNIQUE_CONSTRAINT");
    });

    test("P2025 returns RECORD_NOT_FOUND", () => {
      expect(parsePrismaErrorKind({ code: "P2025" })).toBe("RECORD_NOT_FOUND");
    });

    test("P2003 returns FOREIGN_KEY_CONSTRAINT", () => {
      expect(parsePrismaErrorKind({ code: "P2003" })).toBe("FOREIGN_KEY_CONSTRAINT");
    });

    test("P2011 returns NULL_CONSTRAINT", () => {
      expect(parsePrismaErrorKind({ code: "P2011" })).toBe("NULL_CONSTRAINT");
    });

    test("P2006 returns VALIDATION_ERROR", () => {
      expect(parsePrismaErrorKind({ code: "P2006" })).toBe("VALIDATION_ERROR");
    });

    test("P2012 returns VALIDATION_ERROR", () => {
      expect(parsePrismaErrorKind({ code: "P2012" })).toBe("VALIDATION_ERROR");
    });

    test("P2014 returns RELATION_VIOLATION", () => {
      expect(parsePrismaErrorKind({ code: "P2014" })).toBe("RELATION_VIOLATION");
    });
  });

  describe("unknown/invalid inputs", () => {
    test("unknown code returns UNKNOWN", () => {
      expect(parsePrismaErrorKind({ code: "P9999" })).toBe("UNKNOWN");
    });

    test("numeric code returns UNKNOWN", () => {
      expect(parsePrismaErrorKind({ code: 12345 })).toBe("UNKNOWN");
    });

    test("object without code returns UNKNOWN", () => {
      expect(parsePrismaErrorKind({ other: "prop" })).toBe("UNKNOWN");
    });

    test("null returns UNKNOWN", () => {
      expect(parsePrismaErrorKind(null)).toBe("UNKNOWN");
    });

    test("undefined returns UNKNOWN", () => {
      expect(parsePrismaErrorKind(undefined)).toBe("UNKNOWN");
    });

    test("string returns UNKNOWN", () => {
      expect(parsePrismaErrorKind("string")).toBe("UNKNOWN");
    });

    test("number returns UNKNOWN", () => {
      expect(parsePrismaErrorKind(123)).toBe("UNKNOWN");
    });

    test("object with null code returns UNKNOWN", () => {
      expect(parsePrismaErrorKind({ code: null })).toBe("UNKNOWN");
    });

    test("object with undefined code returns UNKNOWN", () => {
      expect(parsePrismaErrorKind({ code: undefined })).toBe("UNKNOWN");
    });
  });
});

describe("PrismaNotFoundError", () => {
  test("has correct _tag", () => {
    const error = new PrismaNotFoundError({
      kind: "RECORD_NOT_FOUND",
      cause: new Error("test"),
      table: "User",
      where: Option.some({ id: 1 }),
    });
    expect(error._tag).toBe("PrismaNotFoundError");
  });

  test("accepts all error kind values", () => {
    const kinds = [
      "UNIQUE_CONSTRAINT",
      "RECORD_NOT_FOUND",
      "FOREIGN_KEY_CONSTRAINT",
      "NULL_CONSTRAINT",
      "VALIDATION_ERROR",
      "RELATION_VIOLATION",
      "UNKNOWN",
    ] as const;

    for (const kind of kinds) {
      const error = new PrismaNotFoundError({
        kind,
        cause: null,
        table: "User",
        where: Option.none(),
      });
      expect(error.kind).toBe(kind);
    }
  });

  test("stores cause", () => {
    const cause = new Error("original");
    const error = new PrismaNotFoundError({
      kind: "RECORD_NOT_FOUND",
      cause,
      table: "User",
      where: Option.some({ id: 1 }),
    });
    expect(error.cause).toBe(cause);
  });

  test("stores table name", () => {
    const error = new PrismaNotFoundError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(error.table).toBe("User");
  });

  test("where can be Option.none", () => {
    const error = new PrismaNotFoundError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(Option.isNone(error.where)).toBe(true);
  });

  test("where can be Option.some", () => {
    const where = { id: 1 };
    const error = new PrismaNotFoundError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where: Option.some(where),
    });
    expect(Option.isSome(error.where)).toBe(true);
    if (Option.isSome(error.where)) {
      expect(error.where.value).toEqual(where);
    }
  });

  test("is instance of Error", () => {
    const error = new PrismaNotFoundError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(error instanceof Error).toBe(true);
  });
});

describe("PrismaCreateError", () => {
  test("has correct _tag", () => {
    const error = new PrismaCreateError({
      kind: "UNIQUE_CONSTRAINT",
      cause: new Error("test"),
      table: "User",
      data: { email: "test@test.com" },
    });
    expect(error._tag).toBe("PrismaCreateError");
  });

  test("stores kind", () => {
    const error = new PrismaCreateError({
      kind: "UNIQUE_CONSTRAINT",
      cause: null,
      table: "User",
      data: {},
    });
    expect(error.kind).toBe("UNIQUE_CONSTRAINT");
  });

  test("stores cause", () => {
    const cause = { code: "P2002" };
    const error = new PrismaCreateError({
      kind: "UNIQUE_CONSTRAINT",
      cause,
      table: "User",
      data: {},
    });
    expect(error.cause).toBe(cause);
  });

  test("stores table", () => {
    const error = new PrismaCreateError({
      kind: "UNIQUE_CONSTRAINT",
      cause: null,
      table: "Post",
      data: {},
    });
    expect(error.table).toBe("Post");
  });

  test("stores data", () => {
    const data = { email: "test@test.com", name: "Test" };
    const error = new PrismaCreateError({
      kind: "UNIQUE_CONSTRAINT",
      cause: null,
      table: "User",
      data,
    });
    expect(error.data).toEqual(data);
  });

  test("is instance of Error", () => {
    const error = new PrismaCreateError({
      kind: "UNIQUE_CONSTRAINT",
      cause: null,
      table: "User",
      data: {},
    });
    expect(error instanceof Error).toBe(true);
  });
});

describe("PrismaUpdateError", () => {
  test("has correct _tag", () => {
    const error = new PrismaUpdateError({
      kind: "RECORD_NOT_FOUND",
      cause: new Error("test"),
      table: "User",
      where: { id: 1 },
      data: { name: "New Name" },
    });
    expect(error._tag).toBe("PrismaUpdateError");
  });

  test("stores kind", () => {
    const error = new PrismaUpdateError({
      kind: "NULL_CONSTRAINT",
      cause: null,
      table: "User",
      where: { id: 1 },
      data: {},
    });
    expect(error.kind).toBe("NULL_CONSTRAINT");
  });

  test("stores cause", () => {
    const cause = new Error("update failed");
    const error = new PrismaUpdateError({
      kind: "RECORD_NOT_FOUND",
      cause,
      table: "User",
      where: { id: 1 },
      data: {},
    });
    expect(error.cause).toBe(cause);
  });

  test("stores table", () => {
    const error = new PrismaUpdateError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "Post",
      where: { id: 1 },
      data: {},
    });
    expect(error.table).toBe("Post");
  });

  test("stores where", () => {
    const where = { id: 123 };
    const error = new PrismaUpdateError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where,
      data: {},
    });
    expect(error.where).toEqual(where);
  });

  test("stores data", () => {
    const data = { name: "Updated" };
    const error = new PrismaUpdateError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where: { id: 1 },
      data,
    });
    expect(error.data).toEqual(data);
  });

  test("is instance of Error", () => {
    const error = new PrismaUpdateError({
      kind: "RECORD_NOT_FOUND",
      cause: null,
      table: "User",
      where: { id: 1 },
      data: {},
    });
    expect(error instanceof Error).toBe(true);
  });
});

describe("PrismaDeleteError", () => {
  test("has correct _tag", () => {
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause: new Error("test"),
      table: "User",
      where: Option.some({ id: 1 }),
    });
    expect(error._tag).toBe("PrismaDeleteError");
  });

  test("stores kind", () => {
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(error.kind).toBe("RELATION_VIOLATION");
  });

  test("stores cause", () => {
    const cause = { code: "P2014" };
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause,
      table: "User",
      where: Option.none(),
    });
    expect(error.cause).toBe(cause);
  });

  test("stores table", () => {
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause: null,
      table: "Post",
      where: Option.none(),
    });
    expect(error.table).toBe("Post");
  });

  test("where can be Option.none", () => {
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(Option.isNone(error.where)).toBe(true);
  });

  test("where can be Option.some", () => {
    const where = { id: 1 };
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause: null,
      table: "User",
      where: Option.some(where),
    });
    expect(Option.isSome(error.where)).toBe(true);
  });

  test("is instance of Error", () => {
    const error = new PrismaDeleteError({
      kind: "RELATION_VIOLATION",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(error instanceof Error).toBe(true);
  });
});

describe("PrismaQueryError", () => {
  test("has correct _tag", () => {
    const error = new PrismaQueryError({
      kind: "UNKNOWN",
      cause: new Error("test"),
      table: "User",
      where: Option.none(),
    });
    expect(error._tag).toBe("PrismaQueryError");
  });

  test("stores kind", () => {
    const error = new PrismaQueryError({
      kind: "VALIDATION_ERROR",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(error.kind).toBe("VALIDATION_ERROR");
  });

  test("stores cause", () => {
    const cause = new Error("query failed");
    const error = new PrismaQueryError({
      kind: "UNKNOWN",
      cause,
      table: "User",
      where: Option.none(),
    });
    expect(error.cause).toBe(cause);
  });

  test("stores table", () => {
    const error = new PrismaQueryError({
      kind: "UNKNOWN",
      cause: null,
      table: "Product",
      where: Option.none(),
    });
    expect(error.table).toBe("Product");
  });

  test("where can be Option.none", () => {
    const error = new PrismaQueryError({
      kind: "UNKNOWN",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(Option.isNone(error.where)).toBe(true);
  });

  test("where can be Option.some", () => {
    const where = { email: { contains: "test" } };
    const error = new PrismaQueryError({
      kind: "UNKNOWN",
      cause: null,
      table: "User",
      where: Option.some(where),
    });
    expect(Option.isSome(error.where)).toBe(true);
  });

  test("is instance of Error", () => {
    const error = new PrismaQueryError({
      kind: "UNKNOWN",
      cause: null,
      table: "User",
      where: Option.none(),
    });
    expect(error instanceof Error).toBe(true);
  });
});
