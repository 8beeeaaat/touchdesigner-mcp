import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ILogger } from "../../core/logger.js";
import type { TouchDesignerClient } from "../../tdClient/index.js";
import { registerTdTools } from "./handlers/tdTools.js";
import { registerUiTools } from "./handlers/uiTools.js";

/**
 * Register resource handlers with MCP server
 */
export function registerTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	registerTdTools(server, logger, tdClient);
	registerUiTools(server, logger, tdClient);
}
