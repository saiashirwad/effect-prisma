import type { DMMF } from "@prisma/generator-helper";

export type ScalarMappings = Readonly<Record<string, string>>;

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeScalarMappings = (
  input: Record<string, string>,
  source: string
): ScalarMappings => {
  const mappings: Record<string, string> = {};

  for (const [key, value] of Object.entries(input)) {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    if (!trimmedKey) {
      throw new Error(`Invalid scalarMappings ${source}: empty key`);
    }
    if (!trimmedValue) {
      throw new Error(
        `Invalid scalarMappings ${source}: empty value for "${trimmedKey}"`
      );
    }

    mappings[trimmedKey] = trimmedValue;
  }

  return mappings;
};

const parseScalarMappingsEntry = (value: string): ScalarMappings => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  if (trimmed.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid scalarMappings JSON: ${message}`);
    }

    if (!isRecord(parsed)) {
      throw new Error("Invalid scalarMappings JSON: expected an object");
    }

    const mappings: Record<string, string> = {};
    for (const [key, rawValue] of Object.entries(parsed)) {
      if (typeof rawValue !== "string") {
        throw new Error(
          `Invalid scalarMappings JSON: "${key}" must map to a string`
        );
      }
      mappings[key] = rawValue;
    }

    return normalizeScalarMappings(mappings, "JSON");
  }

  const mappings: Record<string, string> = {};
  for (const entry of trimmed.split(",")) {
    const part = entry.trim();
    if (!part) {
      continue;
    }

    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(
        `Invalid scalarMappings entry "${part}". Use "Type=Schema" or JSON.`
      );
    }

    const key = part.slice(0, separatorIndex).trim();
    const valuePart = part.slice(separatorIndex + 1).trim();

    if (!key || !valuePart) {
      throw new Error(
        `Invalid scalarMappings entry "${part}". Both key and value are required.`
      );
    }

    mappings[key] = valuePart;
  }

  return normalizeScalarMappings(mappings, "list");
};

const parseScalarMappings = (
  value: string | string[] | undefined
): ScalarMappings => {
  if (typeof value === "string") {
    return parseScalarMappingsEntry(value);
  }

  if (Array.isArray(value)) {
    const merged: Record<string, string> = {};
    for (const entry of value) {
      const parsed = parseScalarMappingsEntry(entry);
      for (const [key, mapping] of Object.entries(parsed)) {
        merged[key] = mapping;
      }
    }
    return merged;
  }

  return {};
};

export function mapPrismaTypeToEffectSchema(
  field: DMMF.Field,
  scalarMappings: ScalarMappings = {}
): string {
  if (field.kind === "object") {
    return "";
  }

  const isOptional = !field.isRequired;
  const isList = field.isList;

  let schemaType: string;

  if (field.kind === "enum") {
    schemaType = `${field.type}Schema`;
  } else {
    const override = scalarMappings[field.type];
    if (override !== undefined) {
      schemaType = override;
    } else {
      switch (field.type) {
        case "String":
          schemaType = "Schema.String";
          break;
        case "Int":
          schemaType = "Schema.Int";
          break;
        case "BigInt":
          schemaType = "Schema.BigIntFromSelf";
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
        case "Bytes":
          schemaType = "Schema.Uint8ArrayFromSelf";
          break;
        case "Json":
          schemaType = "Schema.Unknown";
          break;
        default:
          schemaType = "Schema.Unknown";
      }
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
  scalarMappings: ScalarMappings;
}

export function parseGeneratorConfig(
  config: Record<string, string | string[] | undefined>,
  outputDir: string
): GeneratorConfig {
  const runtimePath = config["runtimePath"];
  const schemasOutput = config["schemasOutput"];
  const scalarMappings = parseScalarMappings(config["scalarMappings"]);
  
  return {
    runtimePath: typeof runtimePath === "string" ? runtimePath : "effect-prisma/runtime",
    outputDir,
    schemasOutputDir: typeof schemasOutput === "string" ? schemasOutput : `${outputDir}/schemas`,
    scalarMappings,
  };
}
