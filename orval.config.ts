import { defineConfig } from "orval";

export default defineConfig({
	api: {
		input: {
			target: "./td/modules/td_server/openapi_server/openapi/openapi.yaml",
		},
		output: {
			// The base URL is applied at request time in customInstance, from
			// the environment. Baking it in here meant smuggling a JS template
			// through the spec's server url and relying on the generator to
			// emit it unescaped, which orval 8.22 stopped doing.
			biome: false,
			clean: true,
			mock: false,
			mode: "single",
			namingConvention: "PascalCase",
			override: {
				mutator: {
					extension: ".js",
					name: "customInstance",
					path: "./src/api/customInstance.ts",
				},
			},
			target: "src/gen/endpoints",
		},
	},
	mcpZod: {
		input: {
			target: "./td/modules/td_server/openapi_server/openapi/openapi.yaml",
		},
		output: {
			biome: false,
			clean: true,
			client: "zod",
			fileExtension: ".zod.ts",
			mode: "single",
			namingConvention: "camelCase",
			target: "src/gen/mcp",
		},
	},
});
