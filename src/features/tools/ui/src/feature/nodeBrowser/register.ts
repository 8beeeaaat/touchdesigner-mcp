import { createUIResource } from "@mcp-ui/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TOOL_NAMES } from "../../../../../../core/constants.js";
import type { ILogger } from "../../../../../../core/logger.js";
import type { TouchDesignerClient } from "../../../../../../tdClient/touchDesignerClient.js";
import { buildHtmlDocument, escapeHtml } from "../../templates/html.js";

const nodeBrowserSchema = z
	.object({
		parentPath: z
			.string()
			.min(1)
			.default("/project1")
			.describe("Initial root path for node listing (e.g. /project1)."),
		pattern: z
			.string()
			.min(1)
			.default("*")
			.describe("Glob pattern for node names."),
	})
	.strict();

type NodeBrowserParams = z.input<typeof nodeBrowserSchema>;

export function registerNodeBrowserTool(
	server: McpServer,
	logger: ILogger,
	_tdClient: TouchDesignerClient,
): void {
	server.tool(
		TOOL_NAMES.UI_TD_NODE_BROWSER,
		"Interactive node browser + parameter editor via mcp-ui",
		nodeBrowserSchema.shape,
		async (params: NodeBrowserParams = {}) => {
			const { parentPath, pattern } = params;
			if (!parentPath || !pattern) {
				throw new Error("Invalid parameters");
			}

			let htmlString: string;
			try {
				htmlString = buildNodeBrowserHtml(parentPath, pattern);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to build UI bundle.";
				logger.sendLog({ data: message, level: "error" });
				return {
					content: [
						{
							text: `UI bundle error: ${message}`,
							type: "text" as const,
						},
					],
				};
			}

			const resource = await createUIResource({
				content: {
					htmlString,
					type: "rawHtml",
				},
				encoding: "text",
				uiMetadata: {
					"preferred-frame-size": ["100%", "1200px"],
				},
				uri: "ui://td/node-browser",
			});

			return {
				content: [resource],
			};
		},
	);
}

function buildNodeBrowserHtml(parentPath: string, pattern: string): string {
	const escapedParent = escapeHtml(parentPath);
	const escapedPattern = escapeHtml(pattern);

	// Build script URL from environment variables
	const httpHost = process.env.MCP_HTTP_HOST || "127.0.0.1";
	const httpPort = process.env.MCP_HTTP_PORT || "6280";
	const scriptUrl = `http://${httpHost}:${httpPort}/static/feature/ui/nodeBrowser.js`;

	return buildHtmlDocument({
		bodyAttributes: [
			'class="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_20%_20%,rgba(69,103,206,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.12),transparent_25%),#0a0f1f] text-slate-100 antialiased"',
		],
		bodyContent: `<div id="td-node-browser-root" data-parent="${escapedParent}" data-pattern="${escapedPattern}"></div>`,
		head: [
			"<style>:root { color-scheme: dark; }</style>",
			`<script src="${scriptUrl}"></script>`,
		],
		title: "TD Node Browser",
	});
}
