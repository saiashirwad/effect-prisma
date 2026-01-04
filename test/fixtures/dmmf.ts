import type { DMMF } from "@prisma/generator-helper";

export function createMockField(
  overrides: Partial<DMMF.Field> = {}
): DMMF.Field {
  return {
    name: "field",
    kind: "scalar",
    isList: false,
    isRequired: true,
    isUnique: false,
    isId: false,
    isReadOnly: false,
    hasDefaultValue: false,
    type: "String",
    isGenerated: false,
    isUpdatedAt: false,
    ...overrides,
  };
}

export function createMockModel(
  name: string,
  fields: DMMF.Field[] = []
): DMMF.Model {
  return {
    name,
    dbName: null,
    schema: null,
    fields,
    primaryKey: null,
    uniqueFields: [],
    uniqueIndexes: [],
    isGenerated: false,
  };
}

export function createMockEnum(
  name: string,
  values: string[]
): DMMF.DatamodelEnum {
  return {
    name,
    values: values.map((v) => ({
      name: v,
      dbName: null,
    })),
    dbName: null,
  };
}

export const mockIdField = createMockField({
  name: "id",
  type: "Int",
  isId: true,
  hasDefaultValue: true,
});

export const mockEmailField = createMockField({
  name: "email",
  type: "String",
  isUnique: true,
});

export const mockNameField = createMockField({
  name: "name",
  type: "String",
  isRequired: false,
});

export const mockCreatedAtField = createMockField({
  name: "createdAt",
  type: "DateTime",
  hasDefaultValue: true,
});

export const mockPublishedField = createMockField({
  name: "published",
  type: "Boolean",
  hasDefaultValue: true,
});

export const mockViewsField = createMockField({
  name: "views",
  type: "BigInt",
  hasDefaultValue: true,
});

export const mockRatingField = createMockField({
  name: "rating",
  type: "Float",
  isRequired: false,
});

export const mockPriceField = createMockField({
  name: "price",
  type: "Decimal",
});

export const mockMetadataField = createMockField({
  name: "metadata",
  type: "Json",
  isRequired: false,
});

export const mockTagsField = createMockField({
  name: "tags",
  type: "String",
  isList: true,
});

export const mockScoresField = createMockField({
  name: "scores",
  type: "Int",
  isList: true,
  isRequired: false,
});

export const mockRoleField = createMockField({
  name: "role",
  kind: "enum",
  type: "UserRole",
});

export const mockStatusField = createMockField({
  name: "status",
  kind: "enum",
  type: "Status",
  isRequired: false,
});

export const mockRolesField = createMockField({
  name: "roles",
  kind: "enum",
  type: "Role",
  isList: true,
});

export const mockAuthorField = createMockField({
  name: "author",
  kind: "object",
  type: "User",
  relationName: "UserPosts",
});

export const mockPostsField = createMockField({
  name: "posts",
  kind: "object",
  type: "Post",
  isList: true,
  relationName: "UserPosts",
});

export const mockUserModel = createMockModel("User", [
  mockIdField,
  mockEmailField,
  mockNameField,
  mockCreatedAtField,
  mockRoleField,
  mockPostsField,
]);

export const mockPostModel = createMockModel("Post", [
  createMockField({ name: "id", type: "Int", isId: true }),
  createMockField({ name: "title", type: "String" }),
  createMockField({ name: "content", type: "String", isRequired: false }),
  mockPublishedField,
  mockViewsField,
  mockCreatedAtField,
  createMockField({
    name: "authorId",
    type: "Int",
  }),
  mockAuthorField,
]);

export const mockProductModel = createMockModel("Product", [
  createMockField({ name: "id", type: "Int", isId: true }),
  createMockField({ name: "name", type: "String" }),
  mockPriceField,
  mockMetadataField,
  mockTagsField,
]);

export const mockUserProfileModel = createMockModel("UserProfile", [
  createMockField({ name: "id", type: "Int", isId: true }),
  createMockField({ name: "bio", type: "String", isRequired: false }),
  mockRatingField,
  mockScoresField,
]);

export const mockUserRoleEnum = createMockEnum("UserRole", [
  "ADMIN",
  "USER",
  "GUEST",
]);

export const mockStatusEnum = createMockEnum("Status", [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
]);

export const mockRoleEnum = createMockEnum("Role", ["READER", "WRITER", "ADMIN"]);
