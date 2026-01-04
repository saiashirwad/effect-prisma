import { Prisma } from "@prisma/client";
import { Schema } from "effect";

type DecimalLike = {
  isFinite(): boolean;
  toString(): string;
  toFixed?(): string;
};

type DecimalConstructor = new (value: string | number) => DecimalLike;

const getDecimalClass = (): DecimalConstructor => {
  if ("Decimal" in Prisma) {
    return (Prisma as unknown as { Decimal: DecimalConstructor }).Decimal;
  }
  throw new Error("Prisma.Decimal not found. Make sure @prisma/client is properly installed.");
};

export const PrismaDecimal = Schema.transform(
  Schema.String,
  Schema.Unknown,
  {
    strict: true,
    decode: (s) => {
      const DecimalClass = getDecimalClass();
      const decimal = new DecimalClass(s);
      if (!decimal.isFinite()) {
        throw new Error("Decimal must be finite");
      }
      return decimal;
    },
    encode: (d) => {
      const value = d as DecimalLike;
      return typeof value.toFixed === "function" ? value.toFixed() : value.toString();
    },
  }
);
