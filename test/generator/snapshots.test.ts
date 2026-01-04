import { describe, expect, test } from "bun:test";
import {
  generateErrorsFile,
  generateRepositoryFile,
  generateIndexFile,
  generateEnumSchemas,
  generateModelSchema,
  generateSchemasIndex,
} from "../../src/generator/templates.js";
import {
  mockUserModel,
  mockPostModel,
  mockProductModel,
  mockUserRoleEnum,
  mockStatusEnum,
} from "../fixtures/dmmf.js";

describe("Generated Code Snapshots", () => {
  describe("Repository File", () => {
    test("User repository matches snapshot", () => {
      const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Post repository matches snapshot", () => {
      const result = generateRepositoryFile(mockPostModel, "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Product repository matches snapshot", () => {
      const result = generateRepositoryFile(mockProductModel, "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Repository with custom runtime path matches snapshot", () => {
      const result = generateRepositoryFile(mockUserModel, "@/lib/runtime");
      expect(result).toMatchSnapshot();
    });
  });

  describe("Errors File", () => {
    test("Single model errors file matches snapshot", () => {
      const result = generateErrorsFile([mockUserModel], "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Multiple models errors file matches snapshot", () => {
      const result = generateErrorsFile(
        [mockUserModel, mockPostModel, mockProductModel],
        "effect-prisma/runtime"
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe("Index File", () => {
    test("Single model index file matches snapshot", () => {
      const result = generateIndexFile([mockUserModel], "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Multiple models index file matches snapshot", () => {
      const result = generateIndexFile(
        [mockUserModel, mockPostModel, mockProductModel],
        "effect-prisma/runtime"
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe("Enum Schemas", () => {
    test("Single enum schema matches snapshot", () => {
      const result = generateEnumSchemas([mockUserRoleEnum]);
      expect(result).toMatchSnapshot();
    });

    test("Multiple enum schemas match snapshot", () => {
      const result = generateEnumSchemas([mockUserRoleEnum, mockStatusEnum]);
      expect(result).toMatchSnapshot();
    });

    test("Empty enums match snapshot", () => {
      const result = generateEnumSchemas([]);
      expect(result).toMatchSnapshot();
    });
  });

  describe("Model Schema", () => {
    test("User schema matches snapshot", () => {
      const result = generateModelSchema(mockUserModel, "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Post schema matches snapshot", () => {
      const result = generateModelSchema(mockPostModel, "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });

    test("Product schema with Decimal matches snapshot", () => {
      const result = generateModelSchema(mockProductModel, "effect-prisma/runtime");
      expect(result).toMatchSnapshot();
    });
  });

  describe("Schemas Index", () => {
    test("Single model schemas index matches snapshot", () => {
      const result = generateSchemasIndex([mockUserModel]);
      expect(result).toMatchSnapshot();
    });

    test("Multiple models schemas index matches snapshot", () => {
      const result = generateSchemasIndex([mockUserModel, mockPostModel, mockProductModel]);
      expect(result).toMatchSnapshot();
    });
  });
});

describe("Option Wrapping in Repository Methods", () => {
  test("findFirst uses Option.fromNullable for where clause", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toContain("Option.fromNullable(args?.where)");
  });

  test("findUnique uses Option.some for required where clause", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toContain("Option.some(args.where)");
  });

  test("findMany uses Option.fromNullable for optional where clause", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toContain("where: Option.fromNullable(args?.where)");
  });

  test("delete uses Option.some for required where clause", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toMatch(/delete:[\s\S]*?Option\.some\(args\.where\)/);
  });

  test("deleteMany uses Option.fromNullable for optional where clause", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toMatch(/deleteMany:[\s\S]*?Option\.fromNullable\(args\?\.where\)/);
  });

  test("count uses Option.fromNullable for optional where clause", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toMatch(/count:[\s\S]*?Option\.fromNullable\(args\?\.where\)/);
  });

  test("imports Option from effect", () => {
    const result = generateRepositoryFile(mockUserModel, "effect-prisma/runtime");
    expect(result).toContain('import { Effect, Option } from "effect"');
  });
});
