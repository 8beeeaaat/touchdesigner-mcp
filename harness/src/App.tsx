import { AppRenderer } from "@mcp-ui/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
	CallToolRequest,
	CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useRef, useState } from "react";

/**
 * Verification harness host for the ui_td_node_browser MCP App (v7 / spec 2026-01-26).
 *
 * Acts as a minimal MCP Apps host:
 * - connects to the local MCP HTTP server (proxied at /mcp),
 * - calls ui_td_node_browser and feeds the result to AppRenderer as toolResult,
 * - AppRenderer fetches the ui:// resource, loads it via the sandbox proxy, and
 *   forwards guest tool calls (detail/create/delete) back through onCallTool,
 * - after a mutation, refetches the browser so the change is visible.
 */

const SANDBOX_URL = new URL("/sandbox.html", window.location.origin);

interface LogEntry {
	at: string;
	msg: string;
}

export function App() {
	const clientRef = useRef<Client | null>(null);
	const [status, setStatus] = useState("idle");
	const [parentPath, setParentPath] = useState("/project1");
	const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
	const [log, setLog] = useState<LogEntry[]>([]);

	const append = useCallback((msg: string) => {
		setLog((l) => [
			{ at: new Date().toLocaleTimeString(), msg },
			...l.slice(0, 60),
		]);
	}, []);

	const connect = useCallback(async () => {
		setStatus("connecting");
		try {
			const transport = new StreamableHTTPClientTransport(
				new URL("/mcp", window.location.origin),
			);
			const client = new Client({ name: "td-harness", version: "0.0.1" });
			await client.connect(transport);
			clientRef.current = client;
			const tools = await client.listTools();
			append(`connected — tools: ${tools.tools.map((t) => t.name).join(", ")}`);
			setStatus("connected");
		} catch (err) {
			append(`connect error: ${String(err)}`);
			setStatus("error");
		}
	}, [append]);

	const openBrowser = useCallback(async () => {
		const client = clientRef.current;
		if (!client) return;
		append(`callTool ui_td_node_browser { parentPath: "${parentPath}" }`);
		try {
			const result = (await client.callTool({
				arguments: { parentPath },
				name: "ui_td_node_browser",
			})) as CallToolResult;
			const count =
				(result.structuredContent as { nodes?: unknown[] } | undefined)?.nodes
					?.length ?? "?";
			append(`result: ${count} node(s)`);
			setToolResult(result);
		} catch (err) {
			append(`callTool error: ${String(err)}`);
		}
	}, [append, parentPath]);

	// Guest tool calls (detail / create / delete) flow here.
	const onCallTool = useCallback(
		async (params: CallToolRequest["params"]) => {
			const client = clientRef.current;
			append(`iframe → ${params.name} ${JSON.stringify(params.arguments)}`);
			if (!client) throw new Error("not connected");
			const res = (await client.callTool(params)) as CallToolResult;
			const text = res.content.find((c) => c.type === "text");
			append(`← ${params.name}: ${text ? text.text : "(ok)"}`);
			if (params.name === "create_td_node" || params.name === "delete_td_node") {
				await openBrowser();
			}
			return res;
		},
		[append, openBrowser],
	);

	return (
		<div
			style={{
				color: "#e2e8f0",
				display: "grid",
				font: "13px system-ui",
				gap: 12,
				gridTemplateColumns: "1fr 360px",
				height: "100vh",
				padding: 12,
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<div style={{ display: "flex", gap: 8 }}>
					<button type="button" onClick={connect}>
						Connect
					</button>
					<input
						value={parentPath}
						onChange={(e) => setParentPath(e.target.value)}
						style={{ background: "#0b1220", color: "#e2e8f0", padding: 4 }}
					/>
					<button
						type="button"
						onClick={openBrowser}
						disabled={status !== "connected"}
					>
						Open node browser
					</button>
					<span>status: {status}</span>
				</div>
				<div
					style={{
						background: "#0b1220",
						border: "1px solid #334155",
						borderRadius: 8,
						flex: 1,
						overflow: "hidden",
					}}
				>
					{toolResult ? (
						<AppRenderer
							client={clientRef.current ?? undefined}
							toolName="ui_td_node_browser"
							sandbox={{ url: SANDBOX_URL }}
							toolInput={{ parentPath }}
							toolResult={toolResult}
							onCallTool={onCallTool}
							onError={(e) => append(`AppRenderer error: ${e.message}`)}
						/>
					) : (
						<p style={{ color: "#94a3b8", padding: 16 }}>
							Connect, then open the node browser.
						</p>
					)}
				</div>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<strong>Action log (host ↔ iframe ↔ MCP)</strong>
				<div
					style={{
						background: "#0b1220",
						border: "1px solid #334155",
						borderRadius: 8,
						flex: 1,
						fontFamily: "ui-monospace, monospace",
						fontSize: 11,
						overflow: "auto",
						padding: 8,
					}}
				>
					{log.map((e) => (
						<div key={e.at + e.msg} style={{ marginBottom: 4 }}>
							<span style={{ color: "#64748b" }}>{e.at}</span> {e.msg}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
