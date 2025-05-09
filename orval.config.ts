import dotenv from "dotenv";
import { defineConfig } from "orval";

dotenv.config();

export default defineConfig({
	api: {
		input: {
			target: "./td/modules/td_server/openapi_server/openapi/openapi.yaml",
		},
		output: {
			baseUrl: {
				getBaseUrlFromSpecification: true,
				variables: {
					baseUrl: process.env.TD_WEB_SERVER_URL || "http://localhost:9981",
				},
			},
			namingConvention: "PascalCase",
			mode: "single",
			target: "src/gen/endpoints",
			mock: false,
			clean: true,
			biome: false,
			override: {
				mutator: {
					path: "./src/api/customInstance.ts",
					name: "customInstance",
					extension: ".js",
				},
			},
		},
	},
	mcpZod: {
		input: {
			target: "./td/modules/td_server/openapi_server/openapi/openapi.yaml",
		},
		output: {
			mode: "single",
			client: "zod",
			target: "src/gen/mcp",
			fileExtension: ".zod.ts",
			clean: true,
			biome: false,
		},
	},
});
