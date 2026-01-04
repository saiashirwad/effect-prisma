import gh from "@prisma/generator-helper";
import fs from "node:fs/promises";
import path from "node:path";

import { parseGeneratorConfig, toSnakeCase } from "./generator/utils.js";
import {
  generateErrorsFile,
  generateRepositoryFile,
  generateIndexFile,
  generateEnumSchemas,
  generateModelSchema,
  generateSchemasIndex,
} from "./generator/templates.js";

gh.generatorHandler({
  onManifest() {
    return {
      defaultOutput: "./generated/effect",
      prettyName: "Effect Prisma Generator",
      requiresEngines: ["queryEngine"],
    };
  },

  async onGenerate(options) {
    const outputDir = options.generator.output?.value;

    if (!outputDir) {
      throw new Error("No output directory specified");
    }

    const config = parseGeneratorConfig(
      options.generator.config,
      outputDir
    );

    const models = options.dmmf.datamodel.models;
    const enums = options.dmmf.datamodel.enums;

    console.log(`Generating Effect repositories to ${outputDir}`);

    await fs.rm(outputDir, { recursive: true, force: true });
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(
      path.join(outputDir, "errors.ts"),
      generateErrorsFile(models, config.runtimePath)
    );

    for (const model of models) {
      const fileName = `${toSnakeCase(model.name)}.ts`;
      await fs.writeFile(
        path.join(outputDir, fileName),
        generateRepositoryFile(model, config.runtimePath)
      );
    }

    await fs.writeFile(
      path.join(outputDir, "index.ts"),
      generateIndexFile(models, config.runtimePath)
    );

    console.log(`Successfully generated ${models.length} repositories`);

    const schemasOutputDir = config.schemasOutputDir;
    console.log(`Generating Effect schemas to ${schemasOutputDir}...`);

    await fs.mkdir(schemasOutputDir, { recursive: true });

    await fs.writeFile(
      path.join(schemasOutputDir, "enums.ts"),
      generateEnumSchemas(enums)
    );

    for (const model of models) {
      const fileName = `${toSnakeCase(model.name)}.ts`;
      await fs.writeFile(
        path.join(schemasOutputDir, fileName),
        generateModelSchema(model, config.runtimePath)
      );
    }

    await fs.writeFile(
      path.join(schemasOutputDir, "index.ts"),
      generateSchemasIndex(models)
    );

    console.log(
      `Successfully generated ${models.length} model schemas + ${enums.length} enum schemas`
    );
  },
});
