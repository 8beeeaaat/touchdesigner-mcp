import { UIResourceRenderer } from "@mcp-ui/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
	CallToolResult,
	ContentBlock,
	Resource,
} from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

const DEFAULT_HTTP =
	typeof import.meta.env.VITE_MCP_HTTP_URL === "string"
		? import.meta.env.VITE_MCP_HTTP_URL
		: "/mcp";

type ConnectState = "idle" | "connecting" | "connected" | "error";

export default function App() {
	const [endpoint, setEndpoint] = useState(DEFAULT_HTTP);
	const [connectState, setConnectState] = useState<ConnectState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [client, setClient] = useState<Client | null>(null);
	const [transport, setTransport] =
		useState<StreamableHTTPClientTransport | null>(null);

	const [resource, setResource] = useState<Resource | null>(null);
	const [loadingTool, setLoadingTool] = useState(false);
	const [parentPath, setParentPath] = useState("/project1");

	const canRun = connectState === "connected" && Boolean(client);

	const handleConnect = useCallback(async () => {
		setConnectState("connecting");
		setError(null);
		try {
			// 古い接続をクローズ
			transport?.close();

			const url = resolveEndpoint(endpoint);
			const newTransport = new StreamableHTTPClientTransport(url);

			const c = new Client({ name: "td-ui-client", version: "0.0.1" });
			await c.connect(newTransport);
			setClient(c);
			setTransport(newTransport);
			setConnectState("connected");
		} catch (err) {
			console.error(err);
			setConnectState("error");
			setError(String(err));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [endpoint, transport]);

	useEffect(() => {
		return () => {
			transport?.close();
		};
	}, [transport]);

	async function runUiTool() {
		if (!client) return;
		setLoadingTool(true);
		setError(null);
		try {
			const result = (await client.callTool({
				arguments: {
					parentPath: parentPath.trim() || "/project1",
				},
				name: "ui_td_node_browser",
			})) as CallToolResult;

			const found = extractResource(result.content);
			if (!found) {
				setError("UIResource が見つかりませんでした");
			}
			setResource(found ?? null);
		} catch (err) {
			console.error(err);
			const message = String(err);
			// Invalid session の場合は再接続を試みる
			if (message.includes("Invalid session")) {
				setConnectState("idle");
				await handleConnect();
			}
			setError(message);
		} finally {
			setLoadingTool(false);
		}
	}

	return (
		<div className="page">
			<header className="header">
				<div>
					<h1 className="title">TD Node Browser (React + SDK)</h1>
					<p className="subtitle">
						MCP SDKで `ui_td_node_browser` を呼び出し、UIResource を
						`UIResourceRenderer` で表示するサンプルです。
					</p>
				</div>
				<div className="badge-row">
					<span className="badge">@modelcontextprotocol/sdk</span>
					<span className="badge">@mcp-ui/client</span>
				</div>
			</header>

			<section className="glass panel" style={{ display: "flex", gap: 12 }}>
				<div style={{ flex: 1 }}>
					<div className="label">MCP HTTP Endpoint</div>
					<input
						className="input"
						value={endpoint}
						onChange={(e) => setEndpoint(e.target.value)}
						placeholder="http://127.0.0.1:6280/mcp"
					/>
					<div className="label" style={{ marginTop: 10 }}>
						Parent Path
					</div>
					<input
						className="input"
						value={parentPath}
						onChange={(e) => setParentPath(e.target.value)}
						placeholder="/project1"
					/>
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<button
						type="button"
						className="button"
						onClick={handleConnect}
						disabled={connectState === "connecting"}
					>
						{connectState === "connecting"
							? "接続中…"
							: connectState === "connected"
								? "再接続"
								: "接続"}
					</button>
					<button
						type="button"
						className="button"
						onClick={runUiTool}
						disabled={!canRun || loadingTool}
					>
						{loadingTool ? "取得中…" : "ui_td_node_browser 実行"}
					</button>
					<div className="status">
						状態: {connectState}
						{error ? ` / ${error}` : ""}
					</div>
				</div>
			</section>

			<section className="glass panel" style={{ minHeight: 320 }}>
				<div className="label">UIResource Renderer</div>
				{resource ? (
					<div
						style={{
							border: "1px solid #1f2a44",
							borderRadius: 12,
							minHeight: "inherit",
							overflowY: "scroll",
						}}
					>
						<UIResourceRenderer
							htmlProps={{
								style: {
									minHeight: "inherit",
								},
							}}
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							resource={resource as any}
							onUIAction={async (action) => {
								// デモ用: そのままホストへツール呼び出しを転送
								if (!client) return;
								if (action.type === "tool") {
									return client.callTool({
										arguments: action.payload.params,
										name: action.payload.toolName,
									});
								}
								return undefined;
							}}
						/>
					</div>
				) : (
					<p className="status">UIResource を取得してください。</p>
				)}
			</section>
		</div>
	);
}

function extractResource(content?: ContentBlock[] | null): Resource | null {
	if (!content) return null;
	for (const block of content) {
		if (block.type === "resource") {
			// UIResourceRenderer が name を要求するため補完
			return {
				name: block.resource.uri ?? "ui-resource",
				...block.resource,
			} as Resource;
		}
	}
	return null;
}

function resolveEndpoint(raw: string): URL {
	try {
		// 絶対URL (http/https)
		return new URL(raw);
	} catch {
		// 相対パスを window.location.origin 基準で解決
		if (typeof window !== "undefined" && window.location?.origin) {
			return new URL(raw, window.location.origin);
		}
		throw new Error("Endpoint URL が不正です");
	}
}
