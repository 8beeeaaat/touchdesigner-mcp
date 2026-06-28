import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrowserNode, NodeBrowserData, Theme } from "./types";

// Tool names the UI calls back on the host. Must match the server's TOOL_NAMES.
const TOOLS = {
	create: "create_td_node",
	delete: "delete_td_node",
	// Open the interactive parameter editor (MCP App) for the picked node.
	edit: "ui_td_param_editor",
	errors: "get_td_node_errors",
} as const;

function extractData(
	result: CallToolResult | undefined,
): NodeBrowserData | null {
	const sc = result?.structuredContent as NodeBrowserData | undefined;
	if (!sc || !Array.isArray(sc.nodes)) return null;
	return sc;
}

/**
 * Inline delete confirmation, shown in place of the Delete button while a node
 * is pending confirmation. Replaces window.confirm(), which the sandboxed iframe
 * may block. Rendered inside li.node — keep it compact (it shares the row).
 *
 * TODO(you): implement the confirmation UI. Render inside a
 * <span className="confirm-inline"> wrapper so it picks up the row layout.
 * Decide what this should contain — at minimum a way to confirm and a way to
 * cancel. Consider:
 *   - How explicit should the warning be? Deleting a TD node is irreversible.
 *     A short "Delete?" vs. spelling out the node path (props.nodePath).
 *   - Which action is visually dominant? The safe default in destructive flows
 *     is to make Cancel the easy/prominent choice and Confirm the deliberate one
 *     (e.g. className="danger" on the confirm button).
 *   - Keyboard affordance: wiring Escape → onCancel mirrors the create form and
 *     helps users who opened the confirm by accident.
 * Call props.onConfirm() to delete, props.onCancel() to back out.
 */
function DeleteConfirm(props: {
	nodePath: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	const onEscape = (e: { key: string }) => {
		if (e.key === "Escape") props.onCancel();
	};
	return (
		<span className="confirm-inline">
			<span className="confirm-msg">Delete this node?</span>
			<button
				type="button"
				className="secondary"
				onClick={props.onCancel}
				onKeyDown={onEscape}
			>
				Cancel
			</button>
			<button
				type="button"
				className="danger"
				onClick={props.onConfirm}
				onKeyDown={onEscape}
			>
				Delete
			</button>
		</span>
	);
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

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
}

export function App() {
	const [data, setData] = useState<NodeBrowserData | null>(null);
	const [filter, setFilter] = useState("");
	const [status, setStatus] = useState<string>("");
	// Inline create form state (replaces window.prompt).
	const [creating, setCreating] = useState(false);
	const [newType, setNewType] = useState("");
	const [newName, setNewName] = useState("");
	// Path of the node awaiting an inline delete confirmation (replaces window.confirm).
	const [confirmPath, setConfirmPath] = useState<string | null>(null);
	const appRef = useRef<ReturnType<typeof useApp>["app"]>(null);

	const { app, isConnected, error } = useApp({
		appInfo: { name: "td-node-browser", version: "0.2.0" },
		autoResize: true,
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

	// Follow the host color theme (light/dark), updating live.
	useEffect(() => {
		if (!app) return;
		const initial = app.getHostContext()?.theme;
		if (initial) applyTheme(initial as Theme);
		app.onhostcontextchanged = (ctx) => {
			if (ctx?.theme) applyTheme(ctx.theme as Theme);
		};
	}, [app]);

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

	const submitCreate = useCallback(() => {
		if (!data) return;
		const nodeType = newType.trim();
		if (!nodeType) return;
		const nodeName = newName.trim();
		const args: Record<string, unknown> = {
			nodeType,
			parentPath: data.parentPath,
		};
		if (nodeName) args.nodeName = nodeName;
		callTool(TOOLS.create, args);
		setNewType("");
		setNewName("");
		setCreating(false);
	}, [callTool, data, newName, newType]);

	const confirmDelete = useCallback(
		(path: string) => {
			callTool(TOOLS.delete, { nodePath: path });
			setConfirmPath(null);
		},
		[callTool],
	);

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
				{creating ? (
					<div className="create-row">
						<input
							type="text"
							placeholder="Operator type (e.g. textTOP)"
							value={newType}
							onChange={(e) => setNewType(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") submitCreate();
								if (e.key === "Escape") setCreating(false);
							}}
						/>
						<input
							type="text"
							placeholder="Name (optional)"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") submitCreate();
								if (e.key === "Escape") setCreating(false);
							}}
						/>
						<button
							type="button"
							onClick={submitCreate}
							disabled={!newType.trim()}
						>
							Create
						</button>
						<button
							type="button"
							className="secondary"
							onClick={() => setCreating(false)}
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						className="secondary"
						onClick={() => setCreating(true)}
					>
						+ Create node
					</button>
				)}
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
								<li className="node" key={n.path} title={n.path}>
									<button
										type="button"
										className="node-open"
										onClick={() => callTool(TOOLS.edit, { nodePath: n.path })}
										title="Edit parameters"
									>
										<span className="node-name">{n.name}</span>
										<span className="node-path">{n.path}</span>
									</button>
									<button
										type="button"
										className="secondary"
										onClick={() => callTool(TOOLS.errors, { nodePath: n.path })}
										title="Check errors"
									>
										!
									</button>
									{confirmPath === n.path ? (
										<DeleteConfirm
											nodePath={n.path}
											onConfirm={() => confirmDelete(n.path)}
											onCancel={() => setConfirmPath(null)}
										/>
									) : (
										<button
											type="button"
											className="danger"
											onClick={() => setConfirmPath(n.path)}
										>
											Delete
										</button>
									)}
								</li>
							))}
						</ul>
					</section>
				))
			)}
		</>
	);
}
