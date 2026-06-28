import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ErrorDashboardData, NodeError, Theme } from "./types";

// Open the parameter editor (MCP App) for a node whose error the user clicks.
const EDIT_TOOL = "ui_td_param_editor";
// Re-run the error scan for the same path.
const RECHECK_TOOL = "get_td_node_errors";

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
}

function extractData(
	result: CallToolResult | undefined,
): ErrorDashboardData | null {
	const sc = result?.structuredContent as ErrorDashboardData | undefined;
	if (!sc || !Array.isArray(sc.errors)) return null;
	return sc;
}

/** Group errors by the node that reported them. */
function groupByNode(errors: NodeError[]): Map<string, NodeError[]> {
	const map = new Map<string, NodeError[]>();
	for (const e of errors) {
		const bucket = map.get(e.nodePath);
		if (bucket) bucket.push(e);
		else map.set(e.nodePath, [e]);
	}
	return map;
}

export function ErrorDashboard() {
	const [data, setData] = useState<ErrorDashboardData | null>(null);
	const [filter, setFilter] = useState("");
	const [status, setStatus] = useState("");
	const appRef = useRef<ReturnType<typeof useApp>["app"]>(null);

	const { app, isConnected, error } = useApp({
		appInfo: { name: "td-error-dashboard", version: "0.1.0" },
		autoResize: true,
		capabilities: {},
		onAppCreated: (a) => {
			appRef.current = a;
			a.ontoolresult = (result) => {
				const parsed = extractData(result as CallToolResult);
				if (parsed) setData(parsed);
			};
		},
	});

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
		const errors = data?.errors ?? [];
		if (!q) return errors;
		return errors.filter(
			(e) =>
				e.nodeName.toLowerCase().includes(q) ||
				e.nodePath.toLowerCase().includes(q) ||
				e.message.toLowerCase().includes(q),
		);
	}, [data, filter]);

	const groups = useMemo(() => groupByNode(filtered), [filtered]);

	if (error) return <p className="status">Connection error: {error.message}</p>;
	if (!isConnected) return <p className="status">Connecting to host…</p>;
	if (!data) return <p className="status">Waiting for error report…</p>;

	return (
		<>
			<header>
				<h1>Node Errors</h1>
				<div className="subtitle">
					{data.nodePath} ·{" "}
					{data.hasErrors ? `${data.errorCount} error(s)` : "no errors found"}
				</div>
				<span className="spacer" />
			</header>

			<div className="toolbar">
				<input
					type="search"
					placeholder="Filter by node or message…"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				/>
				<button
					type="button"
					className="secondary"
					onClick={() => callTool(RECHECK_TOOL, { nodePath: data.nodePath })}
				>
					Re-check
				</button>
				{status && <span className="status">{status}</span>}
			</div>

			{!data.hasErrors ? (
				<p className="empty ok">✓ No errors under {data.nodePath}.</p>
			) : filtered.length === 0 ? (
				<p className="empty">No errors match "{filter}".</p>
			) : (
				Array.from(groups, ([nodePath, errors]) => {
					const head = errors[0];
					return (
						<section className="group" key={nodePath}>
							<h2 className="group-title error-node">
								<button
									type="button"
									className="node-open"
									title="Edit this node's parameters"
									onClick={() => callTool(EDIT_TOOL, { nodePath })}
								>
									<span className="node-name">{head.nodeName}</span>
									<span className="node-path">{nodePath}</span>
								</button>
								<span className="count danger-count">{errors.length}</span>
							</h2>
							<ul className="errors">
								{errors.map((e) => (
									<li className="error-item" key={`${nodePath}:${e.message}`}>
										{e.message}
									</li>
								))}
							</ul>
						</section>
					);
				})
			)}
		</>
	);
}
