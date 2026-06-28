import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ParamEditorData, ParSpec, Theme } from "./types";

// Tool the editor calls back on the host to persist edits.
const UPDATE_TOOL = "update_td_node_parameters";

function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
}

function extractData(
	result: CallToolResult | undefined,
): ParamEditorData | null {
	const sc = result?.structuredContent as ParamEditorData | undefined;
	if (!sc || !Array.isArray(sc.pars)) return null;
	return sc;
}

/**
 * Which input control to render for a parameter, derived from its TD `style`.
 *
 * Precedence matters — checks are ordered most-specific first:
 *   1. Toggle  → checkbox (boolean is unambiguous, must win over number).
 *   2. menu    → keyed off menuNames presence, not the style string, so any
 *      parameter offering a fixed choice set renders a <select> even if TD
 *      renames the style. Covers Menu / StrMenu.
 *   3. Pulse   → a momentary action button (no held value).
 *   4. slider  → numeric Float/Int that has BOTH a min and max; a range needs
 *      finite bounds or the thumb has nowhere to travel.
 *   5. number  → numeric Float/Int without a usable range.
 *   6. text    → fallback for Str / File / Folder / Python / unknown styles.
 */
export type InputKind =
	| "toggle"
	| "menu"
	| "slider"
	| "number"
	| "pulse"
	| "text";

function inputKindFor(p: ParSpec): InputKind {
	if (p.style === "Toggle") return "toggle";
	if (p.menuNames && p.menuNames.length > 0) return "menu";
	if (p.style === "Pulse") return "pulse";
	const numeric = p.style === "Float" || p.style === "Int";
	if (numeric && p.min != null && p.max != null) return "slider";
	if (numeric) return "number";
	return "text";
}

/** Coerce a form input string back to the value type implied by the spec. */
function coerce(p: ParSpec, raw: string): string | number | boolean {
	const kind = inputKindFor(p);
	if (kind === "toggle") return raw === "true";
	if (kind === "slider" || kind === "number")
		return raw === "" ? 0 : Number(raw);
	return raw;
}

function groupByPage(pars: ParSpec[]): Map<string, ParSpec[]> {
	const map = new Map<string, ParSpec[]>();
	for (const p of pars) {
		const key = p.page || "Other";
		const bucket = map.get(key);
		if (bucket) bucket.push(p);
		else map.set(key, [p]);
	}
	return map;
}

export function ParamEditor() {
	const [data, setData] = useState<ParamEditorData | null>(null);
	// Edited values keyed by param name; only entries here are sent on save.
	const [edits, setEdits] = useState<Record<string, string>>({});
	const [filter, setFilter] = useState("");
	const [status, setStatus] = useState("");
	const appRef = useRef<ReturnType<typeof useApp>["app"]>(null);

	const { app, isConnected, error } = useApp({
		appInfo: { name: "td-param-editor", version: "0.2.0" },
		autoResize: true,
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

	const changedCount = Object.keys(edits).length;
	const dirty = changedCount > 0;

	const setEdit = useCallback((name: string, raw: string) => {
		setEdits((s) => ({ ...s, [name]: raw }));
	}, []);

	// Discard a single row's pending edit (revert to the server value).
	const revertEdit = useCallback((name: string) => {
		setEdits((s) => {
			if (!(name in s)) return s;
			const next = { ...s };
			delete next[name];
			return next;
		});
	}, []);

	// Discard all pending edits without saving.
	const resetAll = useCallback(() => {
		setEdits({});
		setStatus("Reverted unsaved changes.");
	}, []);

	const onSave = useCallback(async () => {
		const a = appRef.current ?? app;
		if (!a || !data || !dirty) return;
		// Build a partial properties map of only changed params, coerced back.
		const properties: Record<string, string | number | boolean> = {};
		for (const p of data.pars) {
			const edited = edits[p.name];
			if (edited !== undefined) properties[p.name] = coerce(p, edited);
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

	// Pulse params fire immediately rather than collecting into a save batch.
	const onPulse = useCallback(
		async (name: string) => {
			const a = appRef.current ?? app;
			if (!a || !data) return;
			setStatus(`Pulsing ${name}…`);
			try {
				await a.callServerTool({
					arguments: { nodePath: data.nodePath, properties: { [name]: 1 } },
					name: UPDATE_TOOL,
				});
				setStatus(`${name} pulsed.`);
			} catch (err) {
				setStatus(`Pulse failed: ${String(err)}`);
			}
		},
		[app, data],
	);

	const filtered = useMemo(() => {
		const q = filter.trim().toLowerCase();
		const pars = data?.pars ?? [];
		if (!q) return pars;
		return pars.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.label.toLowerCase().includes(q) ||
				p.page.toLowerCase().includes(q),
		);
	}, [data, filter]);

	const groups = useMemo(() => groupByPage(filtered), [filtered]);

	if (error) return <p className="status">Connection error: {error.message}</p>;
	if (!isConnected) return <p className="status">Connecting to host…</p>;
	if (!data) return <p className="status">Waiting for parameters…</p>;

	return (
		<>
			<header>
				<h1>Parameters</h1>
				<div className="subtitle">
					{data.nodePath} · {data.opType} · {data.pars.length} param(s)
				</div>
				<span className="spacer" />
			</header>

			<div className="toolbar">
				<input
					type="search"
					placeholder="Filter by name, label, or page…"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				/>
				<button type="button" onClick={onSave} disabled={!dirty}>
					{dirty ? `Save changes (${changedCount})` : "Save changes"}
				</button>
				<button
					type="button"
					className="secondary"
					onClick={resetAll}
					disabled={!dirty}
				>
					Reset
				</button>
				{status && <span className="status">{status}</span>}
			</div>

			{filtered.length === 0 ? (
				<p className="empty">
					{filter
						? `No parameters match "${filter}".`
						: `No parameters on ${data.nodePath}.`}
				</p>
			) : (
				Array.from(groups, ([page, pars]) => (
					<section className="group" key={page}>
						<h2 className="group-title">
							{page} <span className="count">{pars.length}</span>
						</h2>
						<ul className="params">
							{pars.map((p) => (
								<ParamRow
									key={p.name}
									spec={p}
									edited={edits[p.name]}
									onChange={(raw) => setEdit(p.name, raw)}
									onRevert={() => revertEdit(p.name)}
									onResetDefault={() =>
										p.default !== undefined &&
										setEdit(p.name, String(p.default))
									}
									onPulse={() => onPulse(p.name)}
								/>
							))}
						</ul>
					</section>
				))
			)}
		</>
	);
}

/** One parameter row: label + the input control chosen by inputKindFor. */
function ParamRow(props: {
	spec: ParSpec;
	edited: string | undefined;
	onChange: (raw: string) => void;
	onRevert: () => void;
	onResetDefault: () => void;
	onPulse: () => void;
}) {
	const { spec, edited, onChange, onRevert, onResetDefault, onPulse } = props;
	const kind = inputKindFor(spec);
	const current = edited ?? String(spec.value);
	const changed = edited !== undefined;
	const disabled = spec.readOnly || spec.enabled === false;
	const id = `p-${spec.name}`;
	// Offer "default" only when the spec carries one and we'd actually change.
	const canResetDefault =
		!disabled && spec.default !== undefined && current !== String(spec.default);

	return (
		<li className={changed ? "param changed" : "param"} title={spec.name}>
			<label className="param-label" htmlFor={id}>
				{spec.label || spec.name}
				{spec.label && spec.label !== spec.name && (
					<span className="param-name">{spec.name}</span>
				)}
			</label>
			<ParamInput
				id={id}
				kind={kind}
				spec={spec}
				current={current}
				disabled={disabled}
				onChange={onChange}
				onPulse={onPulse}
			/>
			<span className="param-actions">
				{changed && (
					<button
						type="button"
						className="row-action"
						title="Revert unsaved change"
						onClick={onRevert}
					>
						↺
					</button>
				)}
				{canResetDefault && (
					<button
						type="button"
						className="row-action"
						title={`Reset to default (${String(spec.default)})`}
						onClick={onResetDefault}
					>
						⌂
					</button>
				)}
			</span>
		</li>
	);
}

/** Render the actual control for a given InputKind. */
function ParamInput(props: {
	id: string;
	kind: InputKind;
	spec: ParSpec;
	current: string;
	disabled: boolean;
	onChange: (raw: string) => void;
	onPulse: () => void;
}) {
	const { id, kind, spec, current, disabled, onChange, onPulse } = props;

	if (kind === "toggle") {
		return (
			<input
				id={id}
				type="checkbox"
				disabled={disabled}
				checked={current === "true"}
				onChange={(e) => onChange(String(e.target.checked))}
			/>
		);
	}

	if (kind === "pulse") {
		return (
			<button type="button" disabled={disabled} onClick={onPulse}>
				Pulse
			</button>
		);
	}

	if (kind === "menu") {
		const names = spec.menuNames ?? [];
		const labels = spec.menuLabels ?? names;
		return (
			<select
				id={id}
				disabled={disabled}
				value={current}
				onChange={(e) => onChange(e.target.value)}
			>
				{names.map((name, i) => (
					<option key={name} value={name}>
						{labels[i] ?? name}
					</option>
				))}
			</select>
		);
	}

	if (kind === "slider") {
		const min = spec.min ?? 0;
		const max = spec.max ?? 1;
		const step = spec.style === "Int" ? 1 : (max - min) / 100 || 0.01;
		return (
			<span className="slider-row">
				<input
					type="range"
					disabled={disabled}
					min={min}
					max={max}
					step={step}
					value={current}
					onChange={(e) => onChange(e.target.value)}
				/>
				<input
					id={id}
					type="number"
					disabled={disabled}
					value={current}
					onChange={(e) => onChange(e.target.value)}
				/>
			</span>
		);
	}

	if (kind === "number") {
		return (
			<input
				id={id}
				type="number"
				disabled={disabled}
				value={current}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	}

	return (
		<input
			id={id}
			type="text"
			disabled={disabled}
			value={current}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}
