/**
 * Node Browser HTML
 *
 * Pure HTML generation for the `ui_td_node_browser` MCP App. Takes a flat list
 * of TouchDesigner nodes and renders a self-contained, sandbox-friendly HTML
 * document that an MCP Apps host displays inside an iframe.
 *
 * This module is deliberately framework-free and side-effect-free so the markup
 * can be unit-tested without a DOM or a running MCP host.
 */

import type { TdNode } from "../../gen/endpoints/TouchDesignerAPI.js";

/** A group of nodes that share the same operator family, ready for rendering. */
export interface NodeGroup {
	/** Operator family/type label shown as the group heading (e.g. "TOP"). */
	type: string;
	/** Nodes belonging to this group. */
	nodes: TdNode[];
}

/**
 * Escape a string for safe interpolation into HTML text/attribute context.
 * Node names and paths originate from TouchDesigner, so they are untrusted.
 */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/**
 * Group nodes for display in the browser panel.
 *
 * Nodes are bucketed by their operator family so the tree reads as
 * "TOP / CHOP / SOP …" sections instead of one flat list. Empty input yields an
 * empty array, and groups preserve first-seen order for stable rendering.
 *
 * Strategy: bucket by `node.opType` (operator family). This matches TD's mental
 * model — "I have N noiseCHOPs and a textTOP" — and makes duplicate-heavy nets
 * scannable. Groups appear in first-seen order (Map preserves insertion order)
 * so the panel reads top-to-bottom like the network was traversed.
 */
export function groupNodes(nodes: TdNode[]): NodeGroup[] {
	const byType = new Map<string, TdNode[]>();
	for (const node of nodes) {
		const bucket = byType.get(node.opType);
		if (bucket) {
			bucket.push(node);
		} else {
			byType.set(node.opType, [node]);
		}
	}
	return Array.from(byType, ([type, groupNodes]) => ({
		nodes: groupNodes,
		type,
	}));
}

/** Render a single node row. */
function renderNodeRow(node: TdNode): string {
	const name = escapeHtml(node.name);
	const path = escapeHtml(node.path);
	return `<li class="node" title="${path}"><span class="node-name">${name}</span><span class="node-path">${path}</span></li>`;
}

/** Render one operator-family group with its node rows. */
function renderGroup(group: NodeGroup): string {
	const heading = escapeHtml(group.type);
	const rows = group.nodes.map(renderNodeRow).join("");
	return `<section class="group"><h2 class="group-title">${heading} <span class="count">${group.nodes.length}</span></h2><ul class="nodes">${rows}</ul></section>`;
}

/**
 * Build the complete HTML document for the node browser.
 *
 * @param nodes - Flat node list from `get_td_nodes`.
 * @param parentPath - Path the nodes were listed under (shown in the header).
 * @returns A standalone HTML string suitable for a `ui://` rawHtml resource.
 */
export function renderNodeBrowserHtml(
	nodes: TdNode[],
	parentPath: string,
): string {
	const safeParent = escapeHtml(parentPath);
	const body =
		nodes.length === 0
			? `<p class="empty">No nodes found under <code>${safeParent}</code>.</p>`
			: groupNodes(nodes).map(renderGroup).join("");

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font: 13px/1.5 -apple-system, system-ui, sans-serif; color: #e2e8f0; background: #0f172a; padding: 16px; }
  header { margin-bottom: 12px; }
  h1 { font-size: 15px; margin: 0 0 2px; }
  .subtitle { color: #94a3b8; font-size: 12px; }
  .group { margin-bottom: 14px; }
  .group-title { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #93c5fd; margin: 0 0 6px; }
  .count { color: #64748b; font-weight: 400; }
  ul.nodes { list-style: none; margin: 0; padding: 0; }
  li.node { display: flex; justify-content: space-between; gap: 12px; padding: 6px 8px; border-radius: 8px; background: #1e293b; margin-bottom: 4px; }
  .node-name { font-weight: 600; }
  .node-path { color: #64748b; font-family: ui-monospace, monospace; font-size: 11px; }
  .empty { color: #94a3b8; }
  code { background: #1e293b; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<header>
  <h1>TouchDesigner Nodes</h1>
  <div class="subtitle">${safeParent} · ${nodes.length} node(s)</div>
</header>
${body}
</body>
</html>`;
}
