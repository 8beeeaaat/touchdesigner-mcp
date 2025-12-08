import { UIResourceRenderer } from "@mcp-ui/client";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
	CallToolResult,
	ContentBlock,
	Resource,
} from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_HTTP =
	typeof import.meta.env.VITE_MCP_HTTP_URL === "string"
		? import.meta.env.VITE_MCP_HTTP_URL
		: "/mcp";

type ConnectState = "idle" | "connecting" | "connected" | "error";

const panelClass =
	"rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-2xl backdrop-blur-md";
const inputClass =
	"w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-blue-500/60 focus:outline-none focus:ring focus:ring-blue-600/40";
const buttonClass =
	"rounded-xl border border-slate-700 bg-gradient-to-br from-blue-600 to-blue-500 px-3 py-2.5 font-semibold text-slate-50 shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "text-xs text-slate-400";
const badgeClass =
	"rounded-xl border border-blue-900/60 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-100";
const statusClass = "text-xs text-slate-300";

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
		<div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 pb-12 pt-8">
			<header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="space-y-1">
					<h1 className="text-xl font-bold text-slate-50">
						TD Node Browser (React + SDK)
					</h1>
					<p className="text-sm text-slate-400">
						MCP SDKで `ui_td_node_browser` を呼び出し、UIResource を
						`UIResourceRenderer` で表示するサンプルです。
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<span className={badgeClass}>@modelcontextprotocol/sdk</span>
					<span className={badgeClass}>@mcp-ui/client</span>
				</div>
			</header>

			<section
				className={`${panelClass} flex flex-col gap-4 md:flex-row md:items-start`}
			>
				<div className="flex-1 space-y-3">
					<div className="flex flex-col gap-1">
						<div className={labelClass}>MCP HTTP Endpoint</div>
						<input
							className={inputClass}
							value={endpoint}
							onChange={(e) => setEndpoint(e.target.value)}
							placeholder="http://127.0.0.1:6280/mcp"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<div className={labelClass}>Parent Path</div>
						<input
							className={inputClass}
							value={parentPath}
							onChange={(e) => setParentPath(e.target.value)}
							placeholder="/project1"
						/>
					</div>
				</div>
				<div className="flex w-full flex-col gap-2 md:w-52">
					<button
						type="button"
						className={buttonClass}
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
						className={buttonClass}
						onClick={runUiTool}
						disabled={!canRun || loadingTool}
					>
						{loadingTool ? "取得中…" : "ui_td_node_browser 実行"}
					</button>
					<div className={`${statusClass} mt-1`}>
						状態: {connectState}
						{error ? ` / ${error}` : ""}
					</div>
				</div>
			</section>

			<section className={`${panelClass} min-h-[320px] space-y-3`}>
				<div className={labelClass}>UIResource Renderer</div>
				{resource ? (
					<div className="min-h-full overflow-y-auto rounded-xl border border-slate-800">
						<UIResourceRenderer
							htmlProps={{
								className: "min-h-full",
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
					<p className={statusClass}>UIResource を取得してください。</p>
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
