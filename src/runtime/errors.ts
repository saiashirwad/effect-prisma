import { Schema } from "effect";

export type PrismaErrorKind =
  | "UNIQUE_CONSTRAINT"
  | "RECORD_NOT_FOUND"
  | "FOREIGN_KEY_CONSTRAINT"
  | "NULL_CONSTRAINT"
  | "VALIDATION_ERROR"
  | "RELATION_VIOLATION"
  | "UNKNOWN";

export function parsePrismaErrorKind(cause: unknown): PrismaErrorKind {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    typeof (cause as Record<string, unknown>).code === "string"
  ) {
    const code = (cause as Record<string, unknown>).code;
    switch (code) {
      case "P2002":
        return "UNIQUE_CONSTRAINT";
      case "P2025":
        return "RECORD_NOT_FOUND";
      case "P2003":
        return "FOREIGN_KEY_CONSTRAINT";
      case "P2011":
        return "NULL_CONSTRAINT";
      case "P2006":
      case "P2012":
        return "VALIDATION_ERROR";
      case "P2014":
        return "RELATION_VIOLATION";
      default:
        return "UNKNOWN";
    }
  }
  return "UNKNOWN";
}

const PrismaErrorKindSchema = Schema.Literal(
  "UNIQUE_CONSTRAINT",
  "RECORD_NOT_FOUND",
  "FOREIGN_KEY_CONSTRAINT",
  "NULL_CONSTRAINT",
  "VALIDATION_ERROR",
  "RELATION_VIOLATION",
  "UNKNOWN"
);

export class PrismaNotFoundError extends Schema.TaggedError<PrismaNotFoundError>()(
  "PrismaNotFoundError",
  {
    kind: PrismaErrorKindSchema,
    cause: Schema.Unknown,
    table: Schema.String,
    where: Schema.optionalWith(Schema.Unknown, { as: "Option" }),
  }
) {}

export class PrismaCreateError extends Schema.TaggedError<PrismaCreateError>()(
  "PrismaCreateError",
  {
    kind: PrismaErrorKindSchema,
    cause: Schema.Unknown,
    table: Schema.String,
    data: Schema.Unknown,
  }
) {}

export class PrismaUpdateError extends Schema.TaggedError<PrismaUpdateError>()(
  "PrismaUpdateError",
  {
    kind: PrismaErrorKindSchema,
    cause: Schema.Unknown,
    table: Schema.String,
    where: Schema.Unknown,
    data: Schema.Unknown,
  }
) {}

export class PrismaDeleteError extends Schema.TaggedError<PrismaDeleteError>()(
  "PrismaDeleteError",
  {
    kind: PrismaErrorKindSchema,
    cause: Schema.Unknown,
    table: Schema.String,
    where: Schema.optionalWith(Schema.Unknown, { as: "Option" }),
  }
) {}

export class PrismaQueryError extends Schema.TaggedError<PrismaQueryError>()(
  "PrismaQueryError",
  {
    kind: PrismaErrorKindSchema,
    cause: Schema.Unknown,
    table: Schema.String,
    where: Schema.optionalWith(Schema.Unknown, { as: "Option" }),
  }
) {}
