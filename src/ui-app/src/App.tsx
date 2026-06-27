import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useMemo, useRef, useState } from "react";
import type { BrowserNode, NodeBrowserData } from "./types";

// Tool names the UI calls back on the host. Must match the server's TOOL_NAMES.
const TOOLS = {
	create: "create_td_node",
	delete: "delete_td_node",
	detail: "get_td_node_parameters",
} as const;

function extractData(result: CallToolResult | undefined): NodeBrowserData | null {
	const sc = result?.structuredContent as NodeBrowserData | undefined;
	if (!sc || !Array.isArray(sc.nodes)) return null;
	return sc;
}

function groupByType(nodes: BrowserNode[]): Map<string, BrowserNode[]> {
	const map = new Map<string, BrowserNode[]>();
	for (const n of nodes) {
		const bucket = map.get(n.opType);
		if (bucket) bucket.push(n);
		else map.set(n.opType, [n]);
	}
	return map;
}

export function App() {
	const [data, setData] = useState<NodeBrowserData | null>(null);
	const [filter, setFilter] = useState("");
	const [status, setStatus] = useState<string>("");
	const appRef = useRef<ReturnType<typeof useApp>["app"]>(null);

	const { app, isConnected, error } = useApp({
		appInfo: { name: "td-node-browser", version: "0.1.0" },
		capabilities: {},
		onAppCreated: (a) => {
			appRef.current = a;
			// Initial render data arrives as the tool result for ui_td_node_browser.
			a.ontoolresult = (result) => {
				const parsed = extractData(result as CallToolResult);
				if (parsed) setData(parsed);
			};
		},
	});

	const callTool = useCallback(
		async (name: string, args: Record<string, unknown>) => {
			const a = appRef.current ?? app;
			if (!a) return;
			setStatus(`Calling ${name}…`);
			try {
				await a.callServerTool({ arguments: args, name });
				setStatus(`${name} done.`);
			} catch (err) {
				setStatus(`${name} failed: ${String(err)}`);
			}
		},
		[app],
	);

	const filtered = useMemo(() => {
		const q = filter.trim().toLowerCase();
		const nodes = data?.nodes ?? [];
		if (!q) return nodes;
		return nodes.filter(
			(n) =>
				n.name.toLowerCase().includes(q) || n.opType.toLowerCase().includes(q),
		);
	}, [data, filter]);

	const groups = useMemo(() => groupByType(filtered), [filtered]);

	const onCreate = useCallback(() => {
		if (!data) return;
		const nodeType = window.prompt("Operator type (e.g. textTOP)")?.trim();
		if (!nodeType) return;
		const nodeName = window.prompt("Node name (optional)")?.trim();
		const args: Record<string, unknown> = {
			nodeType,
			parentPath: data.parentPath,
		};
		if (nodeName) args.nodeName = nodeName;
		callTool(TOOLS.create, args);
	}, [callTool, data]);

	if (error) return <p className="status">Connection error: {error.message}</p>;
	if (!isConnected) return <p className="status">Connecting to host…</p>;
	if (!data) return <p className="status">Waiting for node data…</p>;

	return (
		<>
			<header>
				<h1>TouchDesigner Nodes</h1>
				<div className="subtitle">
					{data.parentPath} · {data.nodes.length} node(s)
				</div>
				<span className="spacer" />
			</header>

			<div className="toolbar">
				<input
					type="search"
					placeholder="Filter by name or type…"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				/>
				<button type="button" className="secondary" onClick={onCreate}>
					+ Create node
				</button>
				{status && <span className="status">{status}</span>}
			</div>

			{filtered.length === 0 ? (
				<p className="empty">
					{filter
						? `No nodes match "${filter}".`
						: `No nodes under ${data.parentPath}.`}
				</p>
			) : (
				Array.from(groups, ([type, nodes]) => (
					<section className="group" key={type}>
						<h2 className="group-title">
							{type} <span className="count">{nodes.length}</span>
						</h2>
						<ul className="nodes">
							{nodes.map((n) => (
								<li
									className="node"
									key={n.path}
									title={n.path}
									onClick={() => callTool(TOOLS.detail, { nodePath: n.path })}
								>
									<span className="node-name">{n.name}</span>
									<span className="node-path">{n.path}</span>
									<button
										type="button"
										className="danger"
										onClick={(e) => {
											e.stopPropagation();
											if (window.confirm(`Delete node ${n.path} ?`)) {
												callTool(TOOLS.delete, { nodePath: n.path });
											}
										}}
									>
										Delete
									</button>
								</li>
							))}
						</ul>
					</section>
				))
			)}
		</>
	);
}
