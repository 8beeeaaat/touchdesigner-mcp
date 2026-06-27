import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorParam, ParamEditorData, Theme } from "./types";

// Tool the editor calls back on the host to persist edits.
const UPDATE_TOOL = "update_td_node_parameters";

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
}

function extractData(
	result: CallToolResult | undefined,
): ParamEditorData | null {
	const sc = result?.structuredContent as ParamEditorData | undefined;
	if (!sc || !Array.isArray(sc.params)) return null;
	return sc;
}

/** Coerce a form input string back to the param's original kind. */
function coerce(
	kind: EditorParam["kind"],
	raw: string,
): string | number | boolean {
	if (kind === "number") return raw === "" ? 0 : Number(raw);
	if (kind === "boolean") return raw === "true";
	return raw;
}

export function ParamEditor() {
	const [data, setData] = useState<ParamEditorData | null>(null);
	// Edited values keyed by param name; only entries here are sent on save.
	const [edits, setEdits] = useState<Record<string, string>>({});
	const [status, setStatus] = useState("");
	const appRef = useRef<ReturnType<typeof useApp>["app"]>(null);

	const { app, isConnected, error } = useApp({
		appInfo: { name: "td-param-editor", version: "0.1.0" },
		capabilities: {},
		onAppCreated: (a) => {
			appRef.current = a;
			a.ontoolresult = (result) => {
				const parsed = extractData(result as CallToolResult);
				if (parsed) {
					setData(parsed);
					setEdits({});
				}
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

	const dirty = Object.keys(edits).length > 0;

	const onSave = useCallback(async () => {
		const a = appRef.current ?? app;
		if (!a || !data || !dirty) return;
		// Build a partial properties map containing only changed params,
		// coerced back to their original kinds.
		const properties: Record<string, string | number | boolean> = {};
		for (const p of data.params) {
			const edited = edits[p.name];
			if (edited !== undefined) properties[p.name] = coerce(p.kind, edited);
		}
		setStatus("Saving…");
		try {
			await a.callServerTool({
				arguments: { nodePath: data.nodePath, properties },
				name: UPDATE_TOOL,
			});
			setStatus("Saved.");
			setEdits({});
		} catch (err) {
			setStatus(`Save failed: ${String(err)}`);
		}
	}, [app, data, dirty, edits]);

	if (error) return <p className="status">Connection error: {error.message}</p>;
	if (!isConnected) return <p className="status">Connecting to host…</p>;
	if (!data) return <p className="status">Waiting for parameters…</p>;

	return (
		<>
			<header>
				<h1>Parameters</h1>
				<div className="subtitle">
					{data.nodePath} · {data.params.length} field(s)
				</div>
				<span className="spacer" />
			</header>

			<div className="toolbar">
				<button type="button" onClick={onSave} disabled={!dirty}>
					Save changes
				</button>
				{status && <span className="status">{status}</span>}
			</div>

			{data.params.length === 0 ? (
				<p className="empty">
					No editable scalar parameters on {data.nodePath}.
				</p>
			) : (
				<ul className="params">
					{data.params.map((p) => {
						const current = edits[p.name] ?? String(p.value);
						const changed = edits[p.name] !== undefined;
						return (
							<li className={changed ? "param changed" : "param"} key={p.name}>
								<label className="param-label" htmlFor={`p-${p.name}`}>
									{p.name}
								</label>
								{p.kind === "boolean" ? (
									<input
										id={`p-${p.name}`}
										type="checkbox"
										checked={current === "true"}
										onChange={(e) =>
											setEdits((s) => ({
												...s,
												[p.name]: String(e.target.checked),
											}))
										}
									/>
								) : (
									<input
										id={`p-${p.name}`}
										type={p.kind === "number" ? "number" : "text"}
										value={current}
										onChange={(e) =>
											setEdits((s) => ({ ...s, [p.name]: e.target.value }))
										}
									/>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</>
	);
}
