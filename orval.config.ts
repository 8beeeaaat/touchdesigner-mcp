import dotenv from "dotenv";
import { defineConfig } from "orval";

dotenv.config();

export default defineConfig({
	api: {
		input: {
			target: "./src/api/index.yml",
		},
		output: {
			baseUrl: {
				getBaseUrlFromSpecification: true,
				variables: {
					baseUrl: process.env.TD_WEB_SERVER_URL || "http://localhost:9981",
				},
			},
			mode: "split",
			target: "src/gen/endpoints",
			schemas: "src/gen/models",
			mock: true,
			clean: true,
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
			target: "./src/api/index.yml",
		},
		output: {
			mode: "split",
			client: "zod",
			target: "src/gen/mcp",
			fileExtension: ".zod.ts",
			clean: true,
		},
	},
});
