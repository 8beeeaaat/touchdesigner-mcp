import { defineConfig } from "orval";

export default defineConfig({
	api: {
		input: {
			target: "./td/modules/td_server/openapi_server/openapi/openapi.yaml",
		},
		output: {
			baseUrl: {
				getBaseUrlFromSpecification: true,
			},
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
			target: "src/gen/mcp",
		},
	},
});
