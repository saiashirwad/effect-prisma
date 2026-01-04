import { describe, expect, test } from "bun:test";
import {
  toCamelCase,
  toSnakeCase,
  toPascalCase,
  mapPrismaTypeToEffectSchema,
  parseGeneratorConfig,
} from "../../src/generator/utils.js";
import { createMockField } from "../fixtures/dmmf.js";

describe("toCamelCase", () => {
  test("converts PascalCase to camelCase", () => {
    expect(toCamelCase("UserProfile")).toBe("userProfile");
  });

  test("converts single uppercase word", () => {
    expect(toCamelCase("User")).toBe("user");
  });

  test("preserves already camelCase input", () => {
    expect(toCamelCase("userProfile")).toBe("userProfile");
  });

  test("handles single character", () => {
    expect(toCamelCase("A")).toBe("a");
  });

  test("handles empty string", () => {
    expect(toCamelCase("")).toBe("");
  });

  test("handles all uppercase acronym", () => {
    expect(toCamelCase("URL")).toBe("uRL");
  });

  test("handles mixed case with numbers", () => {
    expect(toCamelCase("User123")).toBe("user123");
  });
});

describe("toSnakeCase", () => {
  test("converts simple PascalCase", () => {
    expect(toSnakeCase("User")).toBe("user");
  });

  test("converts multi-word PascalCase", () => {
    expect(toSnakeCase("UserProfile")).toBe("user_profile");
  });

  test("converts three word PascalCase", () => {
    expect(toSnakeCase("UserProfileSettings")).toBe("user_profile_settings");
  });

  test("preserves already snake_case", () => {
    expect(toSnakeCase("user_profile")).toBe("user_profile");
  });

  test("converts camelCase input", () => {
    expect(toSnakeCase("userProfile")).toBe("user_profile");
  });

  test("handles single lowercase word", () => {
    expect(toSnakeCase("user")).toBe("user");
  });

  test("handles empty string", () => {
    expect(toSnakeCase("")).toBe("");
  });

  test("handles acronym", () => {
    expect(toSnakeCase("APIUser")).toBe("a_p_i_user");
  });

  test("handles numbers", () => {
    expect(toSnakeCase("User2FA")).toBe("user2_f_a");
  });
});

describe("toPascalCase", () => {
  test("converts camelCase to PascalCase", () => {
    expect(toPascalCase("userProfile")).toBe("UserProfile");
  });

  test("preserves already PascalCase", () => {
    expect(toPascalCase("UserProfile")).toBe("UserProfile");
  });

  test("handles single character", () => {
    expect(toPascalCase("a")).toBe("A");
  });

  test("handles empty string", () => {
    expect(toPascalCase("")).toBe("");
  });

  test("handles all lowercase single word", () => {
    expect(toPascalCase("user")).toBe("User");
  });
});

describe("mapPrismaTypeToEffectSchema", () => {
  describe("basic type mappings", () => {
    test("maps String to Schema.String", () => {
      const field = createMockField({ type: "String" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.String");
    });

    test("maps Int to Schema.Int", () => {
      const field = createMockField({ type: "Int" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Int");
    });

    test("maps BigInt to Schema.BigIntFromSelf", () => {
      const field = createMockField({ type: "BigInt" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.BigIntFromSelf");
    });

    test("maps Float to Schema.Number", () => {
      const field = createMockField({ type: "Float" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Number");
    });

    test("maps Boolean to Schema.Boolean", () => {
      const field = createMockField({ type: "Boolean" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Boolean");
    });

    test("maps DateTime to Schema.Date", () => {
      const field = createMockField({ type: "DateTime" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Date");
    });

    test("maps Decimal to PrismaDecimal", () => {
      const field = createMockField({ type: "Decimal" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("PrismaDecimal");
    });

    test("maps Bytes to Schema.Uint8ArrayFromSelf", () => {
      const field = createMockField({ type: "Bytes" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Uint8ArrayFromSelf");
    });

    test("maps Json to Schema.Unknown", () => {
      const field = createMockField({ type: "Json" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Unknown");
    });

    test("maps unknown type to Schema.Unknown", () => {
      const field = createMockField({ type: "CustomType" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Unknown");
    });
  });

  describe("scalar mapping overrides", () => {
    test("uses override for scalar type", () => {
      const field = createMockField({ type: "Decimal" });
      expect(
        mapPrismaTypeToEffectSchema(field, { Decimal: "Schema.String" })
      ).toBe("Schema.String");
    });

    test("applies overrides before list/optional wrapping", () => {
      const field = createMockField({
        type: "Bytes",
        isList: true,
        isRequired: false,
      });
      expect(
        mapPrismaTypeToEffectSchema(field, { Bytes: "Schema.Uint8Array" })
      ).toBe("Schema.NullOr(Schema.Array(Schema.Uint8Array))");
    });

    test("does not override enum fields", () => {
      const field = createMockField({ kind: "enum", type: "UserRole" });
      expect(
        mapPrismaTypeToEffectSchema(field, { UserRole: "Schema.String" })
      ).toBe("UserRoleSchema");
    });

    test("ignores overrides for object fields", () => {
      const field = createMockField({ kind: "object", type: "User" });
      expect(
        mapPrismaTypeToEffectSchema(field, { User: "Schema.String" })
      ).toBe("");
    });
  });

  describe("optional fields", () => {
    test("wraps String in Schema.NullOr when optional", () => {
      const field = createMockField({ type: "String", isRequired: false });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.NullOr(Schema.String)");
    });

    test("wraps Int in Schema.NullOr when optional", () => {
      const field = createMockField({ type: "Int", isRequired: false });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.NullOr(Schema.Int)");
    });

    test("wraps DateTime in Schema.NullOr when optional", () => {
      const field = createMockField({ type: "DateTime", isRequired: false });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.NullOr(Schema.Date)");
    });

    test("wraps Decimal in Schema.NullOr when optional", () => {
      const field = createMockField({ type: "Decimal", isRequired: false });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.NullOr(PrismaDecimal)");
    });
  });

  describe("list fields", () => {
    test("wraps String in Schema.Array when list", () => {
      const field = createMockField({ type: "String", isList: true });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Array(Schema.String)");
    });

    test("wraps Int in Schema.Array when list", () => {
      const field = createMockField({ type: "Int", isList: true });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Array(Schema.Int)");
    });

    test("wraps Json in Schema.Array when list", () => {
      const field = createMockField({ type: "Json", isList: true });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Array(Schema.Unknown)");
    });
  });

  describe("optional list fields", () => {
    test("wraps list String in Schema.NullOr when optional", () => {
      const field = createMockField({ type: "String", isList: true, isRequired: false });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.NullOr(Schema.Array(Schema.String))");
    });
  });

  describe("enum fields", () => {
    test("maps enum to EnumNameSchema", () => {
      const field = createMockField({ kind: "enum", type: "UserRole" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("UserRoleSchema");
    });

    test("wraps optional enum in Schema.NullOr", () => {
      const field = createMockField({ kind: "enum", type: "Status", isRequired: false });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.NullOr(StatusSchema)");
    });

    test("wraps list enum in Schema.Array", () => {
      const field = createMockField({ kind: "enum", type: "Role", isList: true });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("Schema.Array(RoleSchema)");
    });
  });

  describe("object/relation fields", () => {
    test("returns empty string for object fields", () => {
      const field = createMockField({ kind: "object", type: "User" });
      expect(mapPrismaTypeToEffectSchema(field)).toBe("");
    });
  });
});

describe("parseGeneratorConfig", () => {
  test("uses default values when config is empty", () => {
    const result = parseGeneratorConfig({}, "/output");
    expect(result).toEqual({
      runtimePath: "effect-prisma/runtime",
      outputDir: "/output",
      schemasOutputDir: "/output/schemas",
      scalarMappings: {},
    });
  });

  test("uses custom runtimePath when provided", () => {
    const result = parseGeneratorConfig({ runtimePath: "@/runtime" }, "/output");
    expect(result.runtimePath).toBe("@/runtime");
  });

  test("uses custom schemasOutput when provided", () => {
    const result = parseGeneratorConfig({ schemasOutput: "/custom/schemas" }, "/output");
    expect(result.schemasOutputDir).toBe("/custom/schemas");
  });

  test("uses both custom values when provided", () => {
    const result = parseGeneratorConfig(
      { runtimePath: "@/r", schemasOutput: "/s" },
      "/output"
    );
    expect(result).toEqual({
      runtimePath: "@/r",
      outputDir: "/output",
      schemasOutputDir: "/s",
      scalarMappings: {},
    });
  });

  test("ignores array value for runtimePath", () => {
    const result = parseGeneratorConfig({ runtimePath: ["a", "b"] }, "/output");
    expect(result.runtimePath).toBe("effect-prisma/runtime");
  });

  test("handles undefined values", () => {
    const result = parseGeneratorConfig({ runtimePath: undefined }, "/output");
    expect(result.runtimePath).toBe("effect-prisma/runtime");
  });

  test("parses scalarMappings JSON", () => {
    const result = parseGeneratorConfig(
      { scalarMappings: '{"Decimal":"PrismaDecimal","BigInt":"Schema.BigInt"}' },
      "/output"
    );
    expect(result.scalarMappings).toEqual({
      Decimal: "PrismaDecimal",
      BigInt: "Schema.BigInt",
    });
  });

  test("parses scalarMappings list", () => {
    const result = parseGeneratorConfig(
      { scalarMappings: "Decimal=PrismaDecimal, BigInt=Schema.BigInt" },
      "/output"
    );
    expect(result.scalarMappings).toEqual({
      Decimal: "PrismaDecimal",
      BigInt: "Schema.BigInt",
    });
  });

  test("merges scalarMappings array entries", () => {
    const result = parseGeneratorConfig(
      {
        scalarMappings: ["Decimal=PrismaDecimal", "BigInt=Schema.BigInt"],
      },
      "/output"
    );
    expect(result.scalarMappings).toEqual({
      Decimal: "PrismaDecimal",
      BigInt: "Schema.BigInt",
    });
  });
});
