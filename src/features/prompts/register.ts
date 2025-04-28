import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ILogger } from "../../core/logger.js";
import { registerTdPrompts } from "./handlers/td_prompts.js";

/**
 * Register prompt handlers with MCP server
 */
export function registerPrompts(server: McpServer, logger: ILogger): void {
	registerTdPrompts(server, logger);
}
