import {
	RESOURCE_MIME_TYPE,
	RESOURCE_URI_META_KEY,
	registerAppResource,
	registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOL_NAMES } from "../../../core/constants.js";
import { handleToolError } from "../../../core/errorHandling.js";
import type { ILogger } from "../../../core/logger.js";
import { GetNodesQueryParams } from "../../../gen/mcp/touchDesignerAPI.zod.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";
import {
	loadNodeBrowserHtml,
	NODE_BROWSER_URI,
	toNodeBrowserData,
} from "../../ui/nodeBrowserResource.js";

/**
 * MCP Apps tools (MCP Apps / mcp-ui, spec 2026-01-26).
 *
 * A host that supports MCP Apps fetches the tool's `ui://` resource (declared via
 * `_meta["ui/resourceUri"]`) and renders it in a sandboxed iframe, forwarding the
 * tool's `structuredContent` to the guest UI. Hosts that don't support MCP Apps
 * still get the text summary and can ignore the UI.
 */
export function registerUiTools(
	server: McpServer,
	logger: ILogger,
	tdClient: TouchDesignerClient,
): void {
	// 1) The UI shell: a single prebuilt HTML document served as a ui:// resource.
	registerAppResource(
		server,
		"TouchDesigner Node Browser",
		NODE_BROWSER_URI,
		{
			description: "Interactive browser for TouchDesigner nodes under a path.",
			mimeType: RESOURCE_MIME_TYPE,
		},
		async () => ({
			contents: [
				{
					mimeType: RESOURCE_MIME_TYPE,
					text: loadNodeBrowserHtml(),
					uri: NODE_BROWSER_URI,
				},
			],
		}),
	);

	// 2) The tool: returns node data as structuredContent and points at the UI.
	registerAppTool(
		server,
		TOOL_NAMES.UI_TD_NODE_BROWSER,
		{
			_meta: { [RESOURCE_URI_META_KEY]: NODE_BROWSER_URI },
			description:
				"Browse nodes under a path as an interactive panel (MCP Apps UI). Returns the same data as get_td_nodes; a supporting host renders it as a UI.",
			inputSchema: GetNodesQueryParams.strict().shape,
		},
		async (params) => {
			try {
				const queryParams = GetNodesQueryParams.parse(params);
				const result = await tdClient.getNodes(queryParams);
				if (!result.success) {
					throw result.error;
				}
				const data = toNodeBrowserData(
					result.data.nodes ?? [],
					queryParams.parentPath,
				);
				return {
					content: [
						{
							text: `Found ${data.nodes.length} node(s) under ${data.parentPath}.`,
							type: "text" as const,
						},
					],
					structuredContent: data as unknown as Record<string, unknown>,
				};
			} catch (error) {
				return handleToolError(error, logger, TOOL_NAMES.UI_TD_NODE_BROWSER);
			}
		},
	);
}
