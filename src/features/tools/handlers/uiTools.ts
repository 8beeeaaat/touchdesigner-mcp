import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import { TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import type { ILogger } from "../../../core/logger.js";
import { GetNodesQueryParams } from "../../../gen/mcp/touchDesignerAPI.zod.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import { renderNodeBrowserHtml } from "../../ui/nodeBrowserHtml.js";
import { htmlUiResource } from "../../ui/uiResource.js";

/**
 * MCP Apps tools.
 *
 * Unlike the text-returning tools in `registerTdTools`, these tools return an
 * interactive UI as an embedded `ui://` resource (MCP Apps / mcp-ui). A host
 * that supports MCP Apps renders the resource in a sandboxed iframe; hosts that
 * don't simply ignore the resource content block.
 */
export function registerUiTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	server.tool(
		TOOL_NAMES.UI_TD_NODE_BROWSER,
		"Browse nodes under a path as an interactive panel (MCP Apps UI). Returns the same data as get_td_nodes plus a rendered ui:// resource grouped by operator type.",
		GetNodesQueryParams.strict().shape,
		async (params: Record<string, unknown> = {}) => {
			try {
				// The MCP SDK validates against the registered shape, but parse again
				// to recover the precise GetNodesParams type for the client call.
				const queryParams = GetNodesQueryParams.parse(params);
				const result = await tdClient.getNodes(queryParams);
				if (!result.success) {
					throw result.error;
				}

				const nodes = result.data.nodes ?? [];
				const parentPath = queryParams.parentPath;

				const html = renderNodeBrowserHtml(nodes, parentPath);
				const uiResource = htmlUiResource(
					"ui://touchdesigner/node-browser",
					html,
				);

				const content: z.infer<typeof CallToolResultSchema>["content"] = [
					{
						text: `Rendered ${nodes.length} node(s) under ${parentPath}.`,
						type: "text" as const,
					},
					uiResource,
				];
				return { content };
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.UI_TD_NODE_BROWSER);
			}
		},
	);
}
