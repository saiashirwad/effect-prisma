import { describe, expect, test, beforeAll } from "bun:test";
import { Schema } from "effect";
import { Prisma } from "@prisma/client";

interface DecimalLike {
  isFinite(): boolean;
  toString(): string;
}

const hasPrismaDecimal = "Decimal" in Prisma;

describe("PrismaDecimal", () => {
  let PrismaDecimal: Schema.Schema<unknown, string, never>;

  beforeAll(async () => {
    const decimalModule = await import("../../src/runtime/decimal.js");
    PrismaDecimal = decimalModule.PrismaDecimal;
  });

  describe.skipIf(!hasPrismaDecimal)("decode (string to Decimal)", () => {
    test("decodes valid decimal string", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      const result = decode("123.45");
      expect((result as DecimalLike).toString()).toBe("123.45");
    });

    test("decodes integer string", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      const result = decode("100");
      expect((result as DecimalLike).toString()).toBe("100");
    });

    test("decodes negative number", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      const result = decode("-50.5");
      expect((result as DecimalLike).toString()).toBe("-50.5");
    });

    test("decodes zero", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      const result = decode("0");
      expect((result as DecimalLike).toString()).toBe("0");
    });

    test("decodes very large number", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      const largeNumber = "123456789012345678901234567890.12345";
      const result = decode(largeNumber);
      expect((result as DecimalLike).toString()).toBe(largeNumber);
    });

    test("decodes very small number", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      const result = decode("0.00000001");
      expect((result as DecimalLike).toString()).toBe("0.00000001");
    });
  });

  describe.skipIf(!hasPrismaDecimal)("encode (Decimal to string)", () => {
    test("encodes Decimal to string", () => {
      const encode = Schema.encodeSync(PrismaDecimal);
      const DecimalClass = (Prisma as unknown as { Decimal: new (v: string) => DecimalLike }).Decimal;
      const decimal = new DecimalClass("123.45");
      const result = encode(decimal);
      expect(result).toBe("123.45");
    });

    test("encodes zero Decimal to string", () => {
      const encode = Schema.encodeSync(PrismaDecimal);
      const DecimalClass = (Prisma as unknown as { Decimal: new (v: string) => DecimalLike }).Decimal;
      const decimal = new DecimalClass("0");
      const result = encode(decimal);
      expect(result).toBe("0");
    });

    test("encodes negative Decimal to string", () => {
      const encode = Schema.encodeSync(PrismaDecimal);
      const DecimalClass = (Prisma as unknown as { Decimal: new (v: string) => DecimalLike }).Decimal;
      const decimal = new DecimalClass("-999.99");
      const result = encode(decimal);
      expect(result).toBe("-999.99");
    });
  });

  describe.skipIf(!hasPrismaDecimal)("error cases", () => {
    test("throws for Infinity", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      expect(() => decode("Infinity")).toThrow("Decimal must be finite");
    });

    test("throws for -Infinity", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      expect(() => decode("-Infinity")).toThrow("Decimal must be finite");
    });

    test("throws for NaN", () => {
      const decode = Schema.decodeSync(PrismaDecimal);
      expect(() => decode("NaN")).toThrow("Decimal must be finite");
    });
  });

  describe.skipIf(!hasPrismaDecimal)("roundtrip", () => {
    test("encode then decode preserves value", () => {
      const encode = Schema.encodeSync(PrismaDecimal);
      const decode = Schema.decodeSync(PrismaDecimal);
      const original = "123.45678";
      const decimal = decode(original);
      const encoded = encode(decimal);
      expect(encoded).toBe(original);
    });

    test("roundtrip with negative value", () => {
      const encode = Schema.encodeSync(PrismaDecimal);
      const decode = Schema.decodeSync(PrismaDecimal);
      const original = "-999.123";
      const decimal = decode(original);
      const encoded = encode(decimal);
      expect(encoded).toBe(original);
    });
  });

  test("throws helpful error when Prisma.Decimal not available", () => {
    if (hasPrismaDecimal) {
      return;
    }
    const decode = Schema.decodeSync(PrismaDecimal);
    expect(() => decode("123")).toThrow("Prisma.Decimal not found");
  });
});
