import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { $ } from "bun";

const TEST_DIR = join(import.meta.dir, "..", "fixtures", "integration");
const SCHEMA_PATH = join(TEST_DIR, "prisma", "schema.prisma");
const OUTPUT_PATH = join(TEST_DIR, "generated", "effect");

const TEST_SCHEMA = `
generator client {
  provider = "prisma-client-js"
}

generator effect {
  provider = "node ${join(process.cwd(), "dist", "bin.js")}"
  output   = "../generated/effect"
}

datasource db {
  provider = "sqlite"
  url      = "file:./test.db"
}

enum Status {
  ACTIVE
  INACTIVE
  PENDING
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  status    Status   @default(ACTIVE)
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
`;

describe("Integration: Generator", () => {
  beforeAll(async () => {
    mkdirSync(join(TEST_DIR, "prisma"), { recursive: true });
    writeFileSync(SCHEMA_PATH, TEST_SCHEMA);

    await $`bunx prisma generate --schema=${SCHEMA_PATH}`.quiet();
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("File Generation", () => {
    test("generates repository files for each model", () => {
      expect(existsSync(join(OUTPUT_PATH, "user.ts"))).toBe(true);
      expect(existsSync(join(OUTPUT_PATH, "post.ts"))).toBe(true);
    });

    test("generates index.ts", () => {
      expect(existsSync(join(OUTPUT_PATH, "index.ts"))).toBe(true);
    });

    test("generates errors.ts", () => {
      expect(existsSync(join(OUTPUT_PATH, "errors.ts"))).toBe(true);
    });

    test("generates schemas directory", () => {
      expect(existsSync(join(OUTPUT_PATH, "schemas"))).toBe(true);
      expect(existsSync(join(OUTPUT_PATH, "schemas", "index.ts"))).toBe(true);
      expect(existsSync(join(OUTPUT_PATH, "schemas", "enums.ts"))).toBe(true);
      expect(existsSync(join(OUTPUT_PATH, "schemas", "user.ts"))).toBe(true);
      expect(existsSync(join(OUTPUT_PATH, "schemas", "post.ts"))).toBe(true);
    });
  });

  describe("Generated Repository Content", () => {
    test("repository imports Option from effect", () => {
      const content = readFileSync(join(OUTPUT_PATH, "user.ts"), "utf-8");
      expect(content).toContain('import { Effect, Option } from "effect"');
    });

    test("repository uses Option.fromNullable for optional where clauses", () => {
      const content = readFileSync(join(OUTPUT_PATH, "user.ts"), "utf-8");
      expect(content).toContain("Option.fromNullable(args?.where)");
    });

    test("repository uses Option.some for required where clauses", () => {
      const content = readFileSync(join(OUTPUT_PATH, "user.ts"), "utf-8");
      expect(content).toContain("Option.some(args.where)");
    });

    test("repository exports interface and factory function", () => {
      const content = readFileSync(join(OUTPUT_PATH, "user.ts"), "utf-8");
      expect(content).toContain("export interface UserRepository");
      expect(content).toContain("export function createUserRepository");
    });

    test("repository includes all CRUD methods", () => {
      const content = readFileSync(join(OUTPUT_PATH, "user.ts"), "utf-8");
      const methods = [
        "findFirst",
        "findUnique",
        "findMany",
        "create",
        "createMany",
        "createManyAndReturn",
        "update",
        "updateMany",
        "upsert",
        "delete",
        "deleteMany",
        "count",
      ];
      methods.forEach((method) => {
        expect(content).toContain(`${method}:`);
      });
    });
  });

  describe("Generated Index Content", () => {
    test("index imports all repositories", () => {
      const content = readFileSync(join(OUTPUT_PATH, "index.ts"), "utf-8");
      expect(content).toContain("createUserRepository");
      expect(content).toContain("createPostRepository");
    });

    test("index exports DB service class", () => {
      const content = readFileSync(join(OUTPUT_PATH, "index.ts"), "utf-8");
      expect(content).toContain("export class DB extends Effect.Service");
    });

    test("index exports createDBRepositories helper", () => {
      const content = readFileSync(join(OUTPUT_PATH, "index.ts"), "utf-8");
      expect(content).toContain("export function createDBRepositories");
    });
  });

  describe("Generated Schema Content", () => {
    test("user schema includes all scalar fields", () => {
      const content = readFileSync(join(OUTPUT_PATH, "schemas", "user.ts"), "utf-8");
      expect(content).toContain("UserSchema");
      expect(content).toContain("id:");
      expect(content).toContain("email:");
      expect(content).toContain("name:");
      expect(content).toContain("status:");
      expect(content).toContain("createdAt:");
    });

    test("enum schema is generated correctly", () => {
      const content = readFileSync(join(OUTPUT_PATH, "schemas", "enums.ts"), "utf-8");
      expect(content).toContain("StatusSchema");
      expect(content).toContain('"ACTIVE"');
      expect(content).toContain('"INACTIVE"');
      expect(content).toContain('"PENDING"');
    });

    test("user schema imports enum from enums file", () => {
      const content = readFileSync(join(OUTPUT_PATH, "schemas", "user.ts"), "utf-8");
      expect(content).toContain('import { StatusSchema } from "./enums.js"');
    });
  });

  describe("Generated Errors Content", () => {
    test("errors file contains table name literal", () => {
      const content = readFileSync(join(OUTPUT_PATH, "errors.ts"), "utf-8");
      expect(content).toContain('Schema.Literal("User", "Post")');
    });

    test("errors file re-exports all error types", () => {
      const content = readFileSync(join(OUTPUT_PATH, "errors.ts"), "utf-8");
      expect(content).toContain("PrismaNotFoundError");
      expect(content).toContain("PrismaCreateError");
      expect(content).toContain("PrismaUpdateError");
      expect(content).toContain("PrismaDeleteError");
      expect(content).toContain("PrismaQueryError");
    });
  });
});
