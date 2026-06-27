/**
 * UI Resource builder
 *
 * Thin wrapper around `@mcp-ui/server`'s `createUIResource` so the rest of the
 * codebase depends on a small, intention-revealing helper instead of the SDK
 * surface directly. The returned object is meant to be pushed into a tool
 * result's `content` array; an MCP Apps host renders it inside a sandboxed
 * iframe.
 */

import { createUIResource, type UIResource } from "@mcp-ui/server";

/** `ui://` URI scheme used for all MCP App resources in this server. */
export type UiUri = `ui://${string}`;

/**
 * Wrap a standalone HTML document as a UIResource for a tool result.
 *
 * @param uri - Stable `ui://` identifier for this UI (host-side cache key).
 * @param htmlString - Self-contained HTML document to render in the iframe.
 * @returns A UIResource embeddable in a CallToolResult `content` array.
 */
export function htmlUiResource(uri: UiUri, htmlString: string): UIResource {
	return createUIResource({
		content: { htmlString, type: "rawHtml" },
		encoding: "text",
		uri,
	});
}
