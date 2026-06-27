/**
 * Node Browser HTML
 *
 * Builds the self-contained, interactive HTML document for the
 * `ui_td_node_browser` MCP App. An MCP Apps host renders the returned string in
 * a sandboxed iframe; the embedded vanilla-JS app drives all interaction.
 *
 * Design (MCP Apps native):
 * - The node list is embedded once as JSON; the in-iframe app renders, groups
 *   (by operator family), and filters it entirely client-side — no round trips
 *   for search.
 * - Detail / create / delete are performed by posting a mcp-ui tool-call message
 *   to the host (`{ type: "tool", payload: { toolName, params } }`), which the
 *   host forwards to the corresponding MCP tool.
 *
 * Server-side this module stays pure and side-effect-free so the markup can be
 * unit-tested without a DOM or a running host.
 */

import { TOOL_NAMES } from "../../core/constants.js";
import type { TdNode } from "../../gen/endpoints/TouchDesignerAPI.js";

/** Tool names the in-iframe app posts back to the host. Kept in sync with the server. */
const HOST_TOOLS = {
	create: TOOL_NAMES.CREATE_TD_NODE,
	delete: TOOL_NAMES.DELETE_TD_NODE,
	detail: TOOL_NAMES.GET_TD_NODE_PARAMETERS,
} as const;

/**
 * Escape a string for safe interpolation into HTML text/attribute context.
 * Used for the few values rendered into static markup (e.g. the header path).
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
 * Serialize data for safe embedding inside a `<script>` block.
 *
 * Plain `JSON.stringify` is not safe to drop into HTML: a `</script>` substring
 * (possible inside a node name) would close the script element early. Escaping
 * `<` to its unicode form neutralizes that without changing the parsed value.
 */
export function embedJson(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Fields the browser UI needs — keeps the embedded payload small. */
interface BrowserNode {
	name: string;
	path: string;
	opType: string;
}

function toBrowserNode(node: TdNode): BrowserNode {
	return { name: node.name, opType: node.opType, path: node.path };
}

/**
 * Build the complete interactive HTML document for the node browser.
 *
 * @param nodes - Flat node list from `get_td_nodes`.
 * @param parentPath - Path the nodes were listed under (header + create target).
 * @returns A standalone HTML string suitable for a `ui://` rawHtml resource.
 */
export function renderNodeBrowserHtml(
	nodes: TdNode[],
	parentPath: string,
): string {
	const payload = embedJson({
		nodes: nodes.map(toBrowserNode),
		parentPath,
		tools: HOST_TOOLS,
	});

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.5 -apple-system, system-ui, sans-serif; color: #e2e8f0; background: #0f172a; padding: 16px; }
  header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  h1 { font-size: 15px; margin: 0; }
  .subtitle { color: #94a3b8; font-size: 12px; }
  .spacer { flex: 1; }
  input, button, select { font: inherit; }
  input[type=search], input[type=text], select { background: #0b1220; color: #e2e8f0; border: 1px solid #334155; border-radius: 8px; padding: 6px 10px; }
  input[type=search] { width: 220px; }
  button { background: #1d4ed8; color: #fff; border: 0; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  button.secondary { background: #1e293b; }
  button.danger { background: #7f1d1d; }
  button:hover { opacity: .9; }
  .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
  .group { margin-bottom: 14px; }
  .group-title { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #93c5fd; margin: 0 0 6px; }
  .count { color: #64748b; font-weight: 400; }
  ul.nodes { list-style: none; margin: 0; padding: 0; }
  li.node { display: flex; align-items: center; gap: 12px; padding: 6px 8px; border-radius: 8px; background: #1e293b; margin-bottom: 4px; cursor: pointer; }
  li.node:hover { background: #273449; }
  .node-name { font-weight: 600; }
  .node-path { color: #64748b; font-family: ui-monospace, monospace; font-size: 11px; flex: 1; }
  .node-actions { display: flex; gap: 6px; }
  .node-actions button { padding: 3px 8px; font-size: 11px; }
  .empty, .no-match { color: #94a3b8; padding: 8px 0; }
  code { background: #1e293b; padding: 1px 5px; border-radius: 4px; }
  dialog { background: #0b1220; color: #e2e8f0; border: 1px solid #334155; border-radius: 12px; padding: 16px; min-width: 280px; }
  dialog::backdrop { background: rgba(0,0,0,.5); }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
  .field label { font-size: 11px; color: #94a3b8; }
  .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
</head>
<body>
<header>
  <h1>TouchDesigner Nodes</h1>
  <div class="subtitle" id="subtitle"></div>
  <span class="spacer"></span>
</header>
<div class="toolbar">
  <input id="search" type="search" placeholder="Filter by name or type…" autocomplete="off" />
  <button id="create-btn" class="secondary">+ Create node</button>
</div>
<div id="list"></div>

<dialog id="create-dialog">
  <form method="dialog">
    <div class="field">
      <label for="create-type">Operator type (e.g. textTOP)</label>
      <input id="create-type" type="text" autocomplete="off" />
    </div>
    <div class="field">
      <label for="create-name">Node name</label>
      <input id="create-name" type="text" autocomplete="off" />
    </div>
    <div class="dialog-actions">
      <button value="cancel" class="secondary">Cancel</button>
      <button id="create-confirm" value="confirm">Create</button>
    </div>
  </form>
</dialog>

<script type="application/json" id="data">${payload}</script>
<script>
(function () {
  var data = JSON.parse(document.getElementById("data").textContent);
  var nodes = data.nodes;
  var parentPath = data.parentPath;
  var tools = data.tools;

  document.getElementById("subtitle").textContent = parentPath + " · " + nodes.length + " node(s)";

  function callTool(toolName, params) {
    window.parent.postMessage({ type: "tool", payload: { toolName: toolName, params: params } }, "*");
  }

  function groupByType(list) {
    var map = new Map();
    list.forEach(function (n) {
      if (!map.has(n.opType)) map.set(n.opType, []);
      map.get(n.opType).push(n);
    });
    return map;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function render(filter) {
    var list = document.getElementById("list");
    list.textContent = "";
    var q = (filter || "").trim().toLowerCase();
    var filtered = q
      ? nodes.filter(function (n) {
          return n.name.toLowerCase().indexOf(q) >= 0 || n.opType.toLowerCase().indexOf(q) >= 0;
        })
      : nodes;

    if (filtered.length === 0) {
      list.appendChild(el("p", "no-match", q ? "No nodes match \\"" + filter + "\\"." : "No nodes found under " + parentPath + "."));
      return;
    }

    groupByType(filtered).forEach(function (groupNodes, type) {
      var section = el("section", "group");
      var title = el("h2", "group-title", type + " ");
      title.appendChild(el("span", "count", String(groupNodes.length)));
      section.appendChild(title);
      var ul = el("ul", "nodes");
      groupNodes.forEach(function (n) {
        var li = el("li", "node");
        li.title = n.path;
        li.appendChild(el("span", "node-name", n.name));
        li.appendChild(el("span", "node-path", n.path));
        li.addEventListener("click", function () {
          callTool(tools.detail, { nodePath: n.path });
        });
        var actions = el("div", "node-actions");
        var del = el("button", "danger", "Delete");
        del.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (window.confirm("Delete node " + n.path + " ?")) {
            callTool(tools.delete, { nodePath: n.path });
          }
        });
        actions.appendChild(del);
        li.appendChild(actions);
        ul.appendChild(li);
      });
      section.appendChild(ul);
      list.appendChild(ul.children.length ? section : section);
    });
  }

  document.getElementById("search").addEventListener("input", function (e) {
    render(e.target.value);
  });

  var dialog = document.getElementById("create-dialog");
  document.getElementById("create-btn").addEventListener("click", function () {
    dialog.showModal();
  });
  dialog.addEventListener("close", function () {
    if (dialog.returnValue !== "confirm") return;
    var nodeType = document.getElementById("create-type").value.trim();
    var nodeName = document.getElementById("create-name").value.trim();
    if (!nodeType) return;
    var params = { parentPath: parentPath, nodeType: nodeType };
    if (nodeName) params.nodeName = nodeName;
    callTool(tools.create, params);
  });

  render("");
})();
</script>
</body>
</html>`;
}
