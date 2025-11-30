import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { PROMPT_NAMES, TOOL_NAMES } from "../../../core/constants.js";
import type { ILogger } from "../../../core/logger.js";

const PROMPTS = [
	{
		arguments: [
			{
				description: "Name of the node to check",
				name: "nodeName",
				required: true,
			},
			{
				description: "Family of the node to check",
				name: "nodeFamily",
				required: false,
			},
			{
				description: "Type of the node to check",
				name: "nodeType",
				required: false,
			},
		],
		description: "Fuzzy search for node",
		name: PROMPT_NAMES.SEARCH_NODE,
	},
	{
		arguments: [
			{
				description: "Path to the node to check",
				name: "nodePath",
				required: true,
			},
		],
		description: "Fuzzy search for node and return errors in TouchDesigner.",
		name: PROMPT_NAMES.CHECK_NODE_ERRORS,
	},
	{
		description: "Connect nodes between each other in TouchDesigner.",
		name: PROMPT_NAMES.NODE_CONNECTION,
	},
];

/**
 * Register prompt handlers with MCP server
 */
export function registerTdPrompts(server: McpServer, logger: ILogger): void {
	server.server.setRequestHandler(ListPromptsRequestSchema, async () => {
		return {
			prompts: PROMPTS,
		};
	});

	server.server.setRequestHandler(GetPromptRequestSchema, (request) => {
		try {
			logger.sendLog({
				level: "debug",
				message: `Handling GetPromptRequest: ${request.params.name}`,
			});
			const prompt = getPrompt(request.params.name);
			if (!prompt) {
				throw new Error("Prompt name is required");
			}

			if (prompt.name === PROMPT_NAMES.SEARCH_NODE) {
				if (!request.params.arguments?.nodeName) {
					throw new Error("Missing required argument: nodeName");
				}
				const { nodeName, nodeFamily, nodeType } = request.params.arguments;
				const messages = handleSearchNodePrompt({
					nodeFamily,
					nodeName,
					nodeType,
				});
				return { messages };
			}

			if (prompt.name === PROMPT_NAMES.CHECK_NODE_ERRORS) {
				if (!request.params.arguments?.nodePath) {
					throw new Error("Missing required argument: nodePath");
				}
				const { nodePath } = request.params.arguments;
				const messages = handleCheckNodeErrorsPrompt({
					nodePath,
				});
				return { messages };
			}

			if (prompt.name === PROMPT_NAMES.NODE_CONNECTION) {
				const messages = handleNodeConnectionPrompt();
				return { messages };
			}
			throw new Error(
				`Prompt implementation for ${request.params.name} not found`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.sendLog({
				level: "error",
				message: `Error handling prompt request: ${errorMessage}`,
			});
			throw new Error(errorMessage);
		}
	});
}

function handleSearchNodePrompt(params: {
	nodeName: string;
	nodeFamily?: string;
	nodeType?: string;
}) {
	return [
		{
			content: {
				text: `Use the "${TOOL_NAMES.GET_TD_NODES}", "${TOOL_NAMES.GET_TD_NODE_PARAMETERS}" tools to search nodes what named "${params.nodeName}" in the TouchDesigner project.${
					params.nodeType ? ` Node Type: ${params.nodeType}.` : ""
				}${params.nodeFamily ? ` Node Family: ${params.nodeFamily}.` : ""}`,
				type: "text",
			},
			role: "user",
		},
	];
}

function handleCheckNodeErrorsPrompt(params: { nodePath: string }) {
	return [
		{
			content: {
				text: `Use the "${TOOL_NAMES.EXECUTE_NODE_METHOD}" like "op('${params.nodePath}').errors()" tool to check node errors. If there are any errors, please check the node parameters and connections. If the node has children, please check the child nodes as well. Please check the node connections and parameters. If the node has children, please check the child nodes as well.`,
				type: "text",
			},
			role: "user",
		},
	];
}

function handleNodeConnectionPrompt() {
	return [
		{
			content: {
				text: `Use the "${TOOL_NAMES.EXECUTE_PYTHON_SCRIPT}" tool e.g. op('/project1/text_over_image').outputConnectors[0].connect(op('/project1/out1'))`,
				type: "text",
			},
			role: "user",
		},
	];
}

function getPrompt(name: string): (typeof PROMPTS)[number] {
	const prompt = PROMPTS.find((p) => p.name === name);
	if (!prompt) {
		throw new Error(`Prompt ${name} not found`);
	}
	return prompt;
}
