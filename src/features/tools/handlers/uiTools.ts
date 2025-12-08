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
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", sans-serif; margin: 0; padding: 16px; background: #0b1021; color: #e5e7eb; }
    h1 { font-size: 20px; margin: 0 0 12px; }
    .panel { background: #11162a; border: 1px solid #1f2a44; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
    .row { display: flex; gap: 12px; }
    .column { flex: 1; min-width: 0; }
    label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
    input[type="text"], input[type="number"] { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #253150; background: #0f152b; color: #e5e7eb; }
    input[type="range"] { width: 100%; }
    button { padding: 8px 12px; border: 1px solid #2f3c5f; background: #1a2450; color: #e5e7eb; border-radius: 6px; cursor: pointer; }
    button:hover { background: #223061; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .list { max-height: 240px; overflow: auto; border: 1px solid #1f2a44; border-radius: 8px; background: #0f152b; }
    .list-item { padding: 8px 10px; border-bottom: 1px solid #1f2a44; cursor: pointer; }
    .list-item:last-child { border-bottom: none; }
    .list-item:hover { background: #1a2450; }
    .list-item.active { background: #223061; border-left: 3px solid #58a6ff; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 9999px; background: #1f2a44; color: #a5b4fc; font-size: 11px; margin-left: 6px; }
    .small { font-size: 12px; color: #9ca3af; }
    .muted { color: #6b7280; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .param-row { border: 1px solid #1f2a44; border-radius: 8px; padding: 10px; background: #0f152b; }
    .param-header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .param-controls { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .status { margin-top: 8px; font-size: 12px; color: #93c5fd; }
    .error { color: #fca5a5; }
    .success { color: #86efac; }
  </style>
</head>
<body>
  <h1>TouchDesigner Node Browser</h1>
  <div class="panel">
    <div class="row" style="align-items:flex-end; gap: 8px;">
      <div class="column">
        <label>Parent Path</label>
        <input id="parentPath" type="text" value="${escapedParent}" />
      </div>
      <div class="column">
        <label>Pattern</label>
        <input id="pattern" type="text" value="${escapedPattern}" />
      </div>
      <div style="display:flex; gap: 8px;">
        <button id="loadNodes">ノード取得</button>
      </div>
    </div>
    <div id="nodesStatus" class="status muted"></div>
    <div class="list" id="nodesList"></div>
  </div>

  <div class="panel">
    <div class="row" style="gap: 12px;">
      <div class="column">
        <h2 style="margin:0 0 8px;">パラメータ</h2>
        <div id="selectedNode" class="small muted">ノードを選択してください</div>
      </div>
      <div class="column" style="text-align:right;">
        <button id="refreshNode" disabled>再取得</button>
      </div>
    </div>
    <div id="paramsStatus" class="status muted"></div>
    <div id="paramsContainer" class="grid"></div>
  </div>

  <script>
    (function() {
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
          nodesList.innerHTML = '<div class="list-item muted">ノードなし</div>';
          return;
        }
        nodes.forEach((node) => {
          const item = document.createElement("div");
          item.className = "list-item" + (selectedNode && selectedNode.path === node.path ? " active" : "");
          item.innerHTML = \`<div><strong>\${node.name}</strong> <span class="pill">\${node.opType}</span></div><div class="small muted">\${node.path}</div>\`;
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
          paramsContainer.innerHTML = '<div class="muted">パラメータがありません</div>';
          return;
        }
        entries.slice(0, 40).forEach(([key, value]) => {
          const row = document.createElement("div");
          row.className = "param-row";

          const header = document.createElement("div");
          header.className = "param-header";
          header.innerHTML = \`<div><strong>\${key}</strong></div><div class="small muted">\${typeOf(value)}</div>\`;
          row.appendChild(header);

          const controls = document.createElement("div");
          controls.className = "param-controls";

          const { inputEl, getValue } = createInputForValue(value);
          controls.appendChild(inputEl);

          const applyBtn = document.createElement("button");
          applyBtn.textContent = "更新";
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
          return {
            inputEl: checkbox,
            getValue: () => checkbox.checked,
          };
        }

        if (typeof value === "number" && Number.isFinite(value)) {
          const wrapper = document.createElement("div");
          wrapper.style.flex = "1";

          const range = document.createElement("input");
          range.type = "range";
          const span = Math.max(1, Math.abs(value)) || 1;
          range.min = String(value - span);
          range.max = String(value + span);
          range.step = String(span / 50);
          range.value = String(value);
          range.style.width = "100%";

          const numberInput = document.createElement("input");
          numberInput.type = "number";
          numberInput.value = String(value);
          numberInput.step = String(span / 50);

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
