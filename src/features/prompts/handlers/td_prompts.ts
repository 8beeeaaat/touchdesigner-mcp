import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { PROMPT_NAMES, TOOL_NAMES } from "../../../core/constants.js";
import type { ILogger } from "../../../core/logger.js";

/**
 * Register prompt handlers with MCP server
 *
 * Prompts are registered through the high-level `registerPrompt` API: argument
 * validation is derived from the Zod schemas, and the SDK serves
 * `prompts/list` / `prompts/get` (including the 2026-07-28 cache fields) from
 * these registrations.
 */
export function registerTdPrompts(server: McpServer, logger: ILogger): void {
	server.registerPrompt(
		PROMPT_NAMES.SEARCH_NODE,
		{
			argsSchema: z.object({
				nodeFamily: z
					.string()
					.describe("Family of the node to check")
					.optional(),
				nodeName: z.string().describe("Name of the node to check"),
				nodeType: z.string().describe("Type of the node to check").optional(),
			}),
			description: "Fuzzy search for node",
		},
		({ nodeName, nodeFamily, nodeType }) => {
			logger.sendLog({
				data: `Handling GetPromptRequest: ${PROMPT_NAMES.SEARCH_NODE}`,
				level: "debug",
			});
			return {
				messages: handleSearchNodePrompt({ nodeFamily, nodeName, nodeType }),
			};
		},
	);

	server.registerPrompt(
		PROMPT_NAMES.CHECK_NODE_ERRORS,
		{
			argsSchema: z.object({
				nodePath: z.string().describe("Path to the node to check"),
			}),
			description: "Fuzzy search for node and return errors in TouchDesigner.",
		},
		({ nodePath }) => {
			logger.sendLog({
				data: `Handling GetPromptRequest: ${PROMPT_NAMES.CHECK_NODE_ERRORS}`,
				level: "debug",
			});
			return {
				messages: handleCheckNodeErrorsPrompt({ nodePath }),
			};
		},
	);

	server.registerPrompt(
		PROMPT_NAMES.NODE_CONNECTION,
		{
			description: "Connect nodes between each other in TouchDesigner.",
		},
		() => {
			logger.sendLog({
				data: `Handling GetPromptRequest: ${PROMPT_NAMES.NODE_CONNECTION}`,
				level: "debug",
			});
			return {
				messages: handleNodeConnectionPrompt(),
			};
		},
	);
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
				type: "text" as const,
			},
			role: "user" as const,
		},
	];
}

function handleCheckNodeErrorsPrompt(params: { nodePath: string }) {
	return [
		{
			content: {
				text: `Use the "${TOOL_NAMES.GET_TD_NODE_ERRORS}" tool to inspect "${params.nodePath}" (and optionally its children) for error messages. If errors are returned, examine the affected nodes' parameters and connections to resolve them.`,
				type: "text" as const,
			},
			role: "user" as const,
		},
	];
}

function handleNodeConnectionPrompt() {
	return [
		{
			content: {
				text: `Use the "${TOOL_NAMES.EXECUTE_PYTHON_SCRIPT}" tool e.g. op('/project1/text_over_image').outputConnectors[0].connect(op('/project1/out1'))`,
				type: "text" as const,
			},
			role: "user" as const,
		},
	];
}
