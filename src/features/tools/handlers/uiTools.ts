import { createUIResource } from "@mcp-ui/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TOOL_NAMES } from "../../../core/constants.js";
import type { ILogger } from "../../../core/logger.js";
import type { TouchDesignerClient } from "../../../tdClient/touchDesignerClient.js";

const uiNodeBrowserSchema = z
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

type UiNodeBrowserParams = z.input<typeof uiNodeBrowserSchema>;

export function registerUiTools(
	server: McpServer,
	_logger: ILogger,
	_tdClient: TouchDesignerClient,
): void {
	server.tool(
		TOOL_NAMES.UI_TD_NODE_BROWSER,
		"Interactive node browser + parameter editor via mcp-ui",
		uiNodeBrowserSchema.shape,
		async (params: UiNodeBrowserParams = {}) => {
			const { parentPath, pattern } = params;
			if (!parentPath || !pattern) {
				throw new Error("Invalid parameters");
			}
			const resource = await createUIResource({
				content: {
					htmlString: buildNodeBrowserHtml(parentPath, pattern),
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

	return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TD Node Browser</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { color-scheme: dark; }
  </style>
</head>
<body class="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_20%_20%,rgba(69,103,206,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.12),transparent_25%),#0a0f1f] text-slate-100 antialiased">
  <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
    <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-50">TouchDesigner Node Browser</h1>
        <p class="text-sm text-slate-400">UIResource iframe + TailwindCSS</p>
      </div>
      <span class="inline-flex items-center rounded-full border border-blue-900/60 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100">Tailwind Ready</span>
    </header>

    <section class="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
      <div class="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div class="space-y-1">
          <label class="text-xs text-slate-400">Parent Path</label>
          <input id="parentPath" type="text" value="${escapedParent}" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500/70 focus:ring focus:ring-blue-600/30" />
        </div>
        <div class="space-y-1">
          <label class="text-xs text-slate-400">Pattern</label>
          <input id="pattern" type="text" value="${escapedPattern}" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500/70 focus:ring focus:ring-blue-600/30" />
        </div>
        <div class="flex gap-2 md:justify-end">
          <button id="loadNodes" class="rounded-xl border border-slate-700 bg-gradient-to-br from-blue-600 to-blue-500 px-3 py-2 text-sm font-semibold text-slate-50 shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">ノード取得</button>
        </div>
      </div>
      <div id="nodesStatus" class="text-xs text-slate-400"></div>
      <div id="nodesList" class="max-h-64 overflow-auto rounded-xl border border-slate-800 bg-slate-950/80"></div>
    </section>

    <section class="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-xl backdrop-blur">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <h2 class="m-0 text-lg font-semibold text-slate-50">パラメータ</h2>
          <div id="selectedNode" class="text-sm text-slate-400">ノードを選択してください</div>
        </div>
        <button id="refreshNode" disabled class="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">再取得</button>
      </div>
      <div id="paramsStatus" class="text-xs text-slate-400"></div>
      <div id="paramsContainer" class="grid gap-3 md:grid-cols-2"></div>
    </section>
  </div>

  <script>
    (function() {
      const buttonClass = "rounded-xl border border-slate-700 bg-gradient-to-br from-blue-600 to-blue-500 px-3 py-2 text-sm font-semibold text-slate-50 shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
      const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500/70 focus:ring focus:ring-blue-600/30";
      const listItemBase = "border-b border-slate-800/70 px-3 py-2 text-sm text-slate-100 transition hover:bg-blue-900/20 cursor-pointer";
      const badgeClass = "ml-2 inline-flex items-center rounded-full border border-blue-900/50 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-100";

      const nodesList = document.getElementById("nodesList");
      const nodesStatus = document.getElementById("nodesStatus");
      const paramsContainer = document.getElementById("paramsContainer");
      const paramsStatus = document.getElementById("paramsStatus");
      const selectedNodeLabel = document.getElementById("selectedNode");
      const parentPathInput = document.getElementById("parentPath");
      const patternInput = document.getElementById("pattern");
      const refreshNodeBtn = document.getElementById("refreshNode");

      let nodes = [];
      let selectedNode = null;
      let messageCounter = 0;
      const pending = new Map();

      function nextMessageId() {
        return "ui-msg-" + Date.now() + "-" + (messageCounter++);
      }

      window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data || typeof data !== "object") return;
        if (data.type === "ui-message-response" && data.messageId && pending.has(data.messageId)) {
          const entry = pending.get(data.messageId);
          pending.delete(data.messageId);
          if (data.payload && "response" in data.payload) {
            entry.resolve(data.payload.response);
          } else {
            entry.resolve(undefined);
          }
        }
      });

      function callTool(toolName, params) {
        return new Promise((resolve, reject) => {
          const messageId = nextMessageId();
          pending.set(messageId, { resolve, reject });
          window.parent.postMessage({ type: "tool", payload: { toolName, params }, messageId }, "*");
          setTimeout(() => {
            if (pending.has(messageId)) {
              pending.delete(messageId);
              reject(new Error("timeout"));
            }
          }, 20000);
        });
      }

      function extractTextFromResponse(response) {
        if (!response || !Array.isArray(response.content)) return "";
        const item = response.content.find((c) => c && c.text);
        return item ? item.text : "";
      }

      async function loadNodes() {
        const parentPath = parentPathInput.value.trim() || "/project1";
        const pattern = patternInput.value.trim() || "*";
        nodesStatus.textContent = "読み込み中...";
        nodesList.innerHTML = "";
        selectedNode = null;
        renderSelectedNode();

        try {
          const response = await callTool("${TOOL_NAMES.GET_TD_NODES}", {
            parentPath,
            pattern,
            detailLevel: "detailed",
            responseFormat: "json",
          });
          const text = extractTextFromResponse(response);
          const data = JSON.parse(text);
          nodes = Array.isArray(data.nodes) ? data.nodes : [];
          renderNodeList();
          nodesStatus.textContent = nodes.length ? \`\${nodes.length}件取得\` : "ノードなし";
        } catch (err) {
          nodesStatus.textContent = "取得に失敗しました";
          paramsStatus.textContent = "";
          console.error(err);
        }
      }

      function renderNodeList() {
        nodesList.innerHTML = "";
        if (!nodes.length) {
          nodesList.innerHTML = '<div class="px-3 py-2 text-sm text-slate-500">ノードなし</div>';
          return;
        }
        nodes.forEach((node) => {
          const item = document.createElement("div");
          const active = selectedNode && selectedNode.path === node.path;
          item.className = listItemBase + (active ? " bg-blue-900/25 border-l-4 border-blue-500" : "");
          item.innerHTML = \`<div class="flex items-center gap-2 text-sm font-semibold">\${node.name}<span class="\${badgeClass}">\${node.opType}</span></div><div class="text-xs text-slate-400">\${node.path}</div>\`;
          item.onclick = () => {
            selectNode(node);
          };
          nodesList.appendChild(item);
        });
      }

      async function selectNode(node) {
        selectedNode = node;
        renderSelectedNode();
        await loadNodeDetails(node.path);
      }

      function renderSelectedNode() {
        if (!selectedNode) {
          selectedNodeLabel.textContent = "ノードを選択してください";
          refreshNodeBtn.disabled = true;
          paramsContainer.innerHTML = "";
          return;
        }
        selectedNodeLabel.textContent = \`\${selectedNode.path} (\${selectedNode.opType})\`;
        refreshNodeBtn.disabled = false;
      }

      async function loadNodeDetails(nodePath) {
        paramsStatus.textContent = "パラメータ取得中...";
        paramsContainer.innerHTML = "";
        try {
          const response = await callTool("${TOOL_NAMES.GET_TD_NODE_PARAMETERS}", {
            nodePath,
            detailLevel: "detailed",
            responseFormat: "json",
          });
          const text = extractTextFromResponse(response);
          const data = JSON.parse(text);
          selectedNode = data;
          renderSelectedNode();
          renderParameters(data.properties || {});
          paramsStatus.textContent = "取得完了";
        } catch (err) {
          paramsStatus.textContent = "取得に失敗しました";
          console.error(err);
        }
      }

      function renderParameters(properties) {
        paramsContainer.innerHTML = "";
        const entries = Object.entries(properties);
        if (!entries.length) {
          paramsContainer.innerHTML = '<div class="text-sm text-slate-400">パラメータがありません</div>';
          return;
        }
        entries.slice(0, 40).forEach(([key, value]) => {
          const row = document.createElement("div");
          row.className = "rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-inner shadow-black/20 space-y-3";

          const header = document.createElement("div");
          header.className = "flex items-center justify-between gap-3";
          header.innerHTML = \`<div class="text-sm font-semibold text-slate-50">\${key}</div><div class="text-[11px] uppercase tracking-wide text-slate-400">\${typeOf(value)}</div>\`;
          row.appendChild(header);

          const controls = document.createElement("div");
          controls.className = "flex flex-col gap-2 md:flex-row md:items-center";

          const { inputEl, getValue } = createInputForValue(value);
          controls.appendChild(inputEl);

          const applyBtn = document.createElement("button");
          applyBtn.textContent = "更新";
          applyBtn.className = buttonClass + " w-full md:w-auto";
          applyBtn.onclick = async () => {
            if (!selectedNode) return;
            applyBtn.disabled = true;
            paramsStatus.textContent = \`\${key} 更新中...\`;
            try {
              const newValue = getValue();
              await callTool("${TOOL_NAMES.UPDATE_TD_NODE_PARAMETERS}", {
                nodePath: selectedNode.path,
                properties: { [key]: newValue },
                detailLevel: "summary",
              });
              paramsStatus.textContent = \`\${key} を更新しました\`;
            } catch (err) {
              paramsStatus.textContent = \`\${key} の更新に失敗しました\`;
              console.error(err);
            } finally {
              applyBtn.disabled = false;
            }
          };

          controls.appendChild(applyBtn);
          row.appendChild(controls);
          paramsContainer.appendChild(row);
        });
      }

      function typeOf(value) {
        if (value === null) return "null";
        if (Array.isArray(value)) return "array";
        return typeof value;
      }

      function createInputForValue(value) {
        if (typeof value === "boolean") {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.checked = Boolean(value);
          checkbox.className = "h-5 w-5 accent-blue-500";
          return {
            inputEl: checkbox,
            getValue: () => checkbox.checked,
          };
        }

        if (typeof value === "number" && Number.isFinite(value)) {
          const wrapper = document.createElement("div");
          wrapper.className = "flex w-full flex-col gap-2";

          const range = document.createElement("input");
          range.type = "range";
          const span = Math.max(1, Math.abs(value)) || 1;
          range.min = String(value - span);
          range.max = String(value + span);
          range.step = String(span / 50);
          range.value = String(value);
          range.className = "w-full accent-blue-500";

          const numberInput = document.createElement("input");
          numberInput.type = "number";
          numberInput.value = String(value);
          numberInput.step = String(span / 50);
          numberInput.className = inputClass;

          range.oninput = () => {
            numberInput.value = range.value;
          };
          numberInput.oninput = () => {
            range.value = numberInput.value || "0";
          };

          wrapper.appendChild(range);
          wrapper.appendChild(numberInput);

          return {
            inputEl: wrapper,
            getValue: () => Number(numberInput.value || "0"),
          };
        }

        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.value = value === undefined || value === null ? "" : String(value);
        textInput.className = inputClass;
        return {
          inputEl: textInput,
          getValue: () => textInput.value,
        };
      }

      document.getElementById("loadNodes").onclick = loadNodes;
      refreshNodeBtn.onclick = () => {
        if (selectedNode) {
          loadNodeDetails(selectedNode.path);
        }
      };

      loadNodes();
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
