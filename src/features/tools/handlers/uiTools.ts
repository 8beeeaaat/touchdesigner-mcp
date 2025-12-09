import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ILogger } from "../../../core/logger.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import { registerNodeBrowserTool } from "../ui/src/feature/nodeBrowser/register.js";

export function registerUiTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	registerNodeBrowserTool(server, logger, tdClient);
}
