import type { DMMF } from "@prisma/generator-helper";

export function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function mapPrismaTypeToEffectSchema(field: DMMF.Field): string {
  const isOptional = !field.isRequired;
  const isList = field.isList;

  let schemaType: string;

  switch (field.type) {
    case "String":
      schemaType = "Schema.String";
      break;
    case "Int":
    case "BigInt":
      schemaType = "Schema.Int";
      break;
    case "Float":
      schemaType = "Schema.Number";
      break;
    case "Boolean":
      schemaType = "Schema.Boolean";
      break;
    case "DateTime":
      schemaType = "Schema.Date";
      break;
    case "Decimal":
      schemaType = "PrismaDecimal";
      break;
    case "Json":
      schemaType = "Schema.Unknown";
      break;
    default:
      if (field.kind === "enum") {
        schemaType = `${field.type}Schema`;
      } else if (field.kind === "object") {
        return "";
      } else {
        schemaType = "Schema.Unknown";
      }
  }

  if (isList) {
    schemaType = `Schema.Array(${schemaType})`;
  }

  if (isOptional) {
    schemaType = `Schema.NullOr(${schemaType})`;
  }

  return schemaType;
}

export interface GeneratorConfig {
  runtimePath: string;
  outputDir: string;
  schemasOutputDir: string;
}

export function parseGeneratorConfig(
  config: Record<string, string | string[] | undefined>,
  outputDir: string
): GeneratorConfig {
  const runtimePath = config["runtimePath"];
  const schemasOutput = config["schemasOutput"];
  
  return {
    runtimePath: typeof runtimePath === "string" ? runtimePath : "effect-prisma/runtime",
    outputDir,
    schemasOutputDir: typeof schemasOutput === "string" ? schemasOutput : `${outputDir}/schemas`,
  };
}
