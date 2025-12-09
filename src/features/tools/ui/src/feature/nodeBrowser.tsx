import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

const TOOL_GET_NODES = "__GET_TD_NODES__";
const TOOL_GET_NODE_PARAMS = "__GET_TD_NODE_PARAMETERS__";
const TOOL_UPDATE_NODE_PARAMS = "__UPDATE_TD_NODE_PARAMETERS__";

const buttonClass =
	"rounded-xl border border-slate-700 bg-gradient-to-br from-blue-600 to-blue-500 px-3 py-2 text-sm font-semibold text-slate-50 shadow-sm transition hover:-translate-y-px hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
const inputClass =
	"w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-500/70 focus:ring focus:ring-blue-600/30";
const listItemBase =
	"border-b border-slate-800/70 px-3 py-2 text-sm text-slate-100 transition hover:bg-blue-900/20 cursor-pointer";
const badgeClass =
	"ml-2 inline-flex items-center rounded-full border border-blue-900/50 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-100";
const panelClass =
	"space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 shadow-xl backdrop-blur";

type ToolResponse = {
	content?: Array<{ text?: string }>;
};

interface TdNodeRecord {
	name: string;
	path: string;
	opType?: string;
	properties?: Record<string, unknown>;
}

interface ToolCaller {
	callTool: (
		toolName: string,
		params: Record<string, unknown>,
	) => Promise<ToolResponse | undefined>;
}

function useToolCaller(): ToolCaller {
	const pendingRef = useRef(
		new Map<
			string,
			{ resolve: (value: unknown) => void; reject: () => void }
		>(),
	);
	const counterRef = useRef(0);

	useEffect(() => {
		function handleMessage(event: MessageEvent) {
			const data = event.data;
			if (!data || typeof data !== "object") return;
			if (
				data.type === "ui-message-response" &&
				data.messageId &&
				pendingRef.current.has(data.messageId)
			) {
				const entry = pendingRef.current.get(data.messageId);
				pendingRef.current.delete(data.messageId);
				if (data.payload && "response" in data.payload) {
					entry?.resolve(data.payload.response);
				} else {
					entry?.resolve(undefined);
				}
			}
		}
		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	function callTool(
		toolName: string,
		params: Record<string, unknown>,
	): Promise<ToolResponse | undefined> {
		return new Promise((resolve, reject) => {
			const messageId = `ui-msg-${Date.now()}-${counterRef.current++}`;
			pendingRef.current.set(messageId, { reject, resolve });
			window.parent.postMessage(
				{ messageId, payload: { params, toolName }, type: "tool" },
				"*",
			);
			setTimeout(() => {
				if (pendingRef.current.has(messageId)) {
					pendingRef.current.delete(messageId);
					reject(new Error("timeout"));
				}
			}, 20000);
		});
	}

	return { callTool };
}

function extractTextFromResponse(response?: ToolResponse): string {
	if (!response || !Array.isArray(response.content)) return "";
	const item = response.content.find((c) => c && c.text);
	return item?.text ?? "";
}

interface ParamsListProps {
	properties: Record<string, unknown> | undefined;
	onUpdate: (key: string, value: unknown) => void;
	busyKey: string | null;
}

function ParamsList({ properties, onUpdate, busyKey }: ParamsListProps) {
	const entries = Object.entries(properties ?? {});
	if (!entries.length) {
		return <div className="text-sm text-slate-400">パラメータがありません</div>;
	}

	return (
		<div className="grid gap-3 md:grid-cols-2">
			{entries.slice(0, 40).map(([key, value]) => (
				<ParamRow
					key={key}
					name={key}
					value={value}
					onUpdate={onUpdate}
					disabled={busyKey === key}
				/>
			))}
		</div>
	);
}

interface ParamRowProps {
	name: string;
	value: unknown;
	onUpdate: (key: string, value: unknown) => void;
	disabled: boolean;
	key?: string;
}

function ParamRow({ name, value, onUpdate, disabled }: ParamRowProps) {
	const [draft, setDraft] = useState(value as unknown);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	const controls =
		typeof draft === "boolean" ? (
			<input
				className="h-5 w-5 accent-blue-500"
				checked={Boolean(draft)}
				onChange={(e: any) => setDraft(Boolean(e.target.checked))}
				type="checkbox"
			/>
		) : typeof draft === "number" && Number.isFinite(draft) ? (
			<NumberInput value={draft} onChange={setDraft} />
		) : (
			<input
				className={inputClass}
				onChange={(e: any) => setDraft(e.target.value)}
				type="text"
				value={draft === undefined || draft === null ? "" : String(draft)}
			/>
		);

	return (
		<div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-inner shadow-black/20 space-y-3">
			<div className="flex items-center justify-between gap-3">
				<div className="text-sm font-semibold text-slate-50">{name}</div>
				<div className="text-[11px] uppercase tracking-wide text-slate-400">
					{typeOf(value)}
				</div>
			</div>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				{controls}
				<button
					className={`${buttonClass} w-full md:w-auto`}
					disabled={disabled}
					onClick={() => onUpdate(name, draft)}
					type="button"
				>
					{disabled ? "更新中…" : "更新"}
				</button>
			</div>
		</div>
	);
}

interface NumberInputProps {
	value: number;
	onChange: (value: number) => void;
}

function NumberInput({ value, onChange }: NumberInputProps) {
	const span = Math.max(1, Math.abs(value)) || 1;
	return (
		<div className="flex w-full flex-col gap-2">
			<input
				className="w-full accent-blue-500"
				defaultValue={value}
				max={value + span}
				min={value - span}
				onChange={(e: any) => onChange(Number(e.target.value || "0"))}
				step={span / 50}
				type="range"
			/>
			<input
				className={inputClass}
				onChange={(e: any) => onChange(Number(e.target.value || "0"))}
				type="number"
				value={value}
				step={span / 50}
			/>
		</div>
	);
}

interface NodeListProps {
	nodes: TdNodeRecord[];
	selectedPath: string;
	onSelect: (node: TdNodeRecord) => void;
}

function TdNodeList({ nodes, selectedPath, onSelect }: NodeListProps) {
	if (!nodes.length) {
		return <div className="px-3 py-2 text-sm text-slate-500">ノードなし</div>;
	}
	return (
		<>
			{nodes.map((node) => (
				<button
					type="button"
					key={node.path}
					className={
						listItemBase +
						(selectedPath === node.path
							? " bg-blue-900/25 border-l-4 border-blue-500"
							: "")
					}
					onClick={() => onSelect(node)}
				>
					<div className="flex items-center gap-2 text-sm font-semibold">
						{node.name}
						<span className={badgeClass}>{node.opType || "N/A"}</span>
					</div>
					<div className="text-xs text-slate-400">{node.path}</div>
				</button>
			))}
		</>
	);
}

interface NodeBrowserAppProps {
	initialParent: string;
	initialPattern: string;
}

function NodeBrowserApp({
	initialParent,
	initialPattern,
}: NodeBrowserAppProps) {
	const { callTool } = useToolCaller();
	const [parentPath, setParentPath] = useState(initialParent || "/project1");
	const [pattern, setPattern] = useState(initialPattern || "*");
	const [nodes, setNodes] = useState([] as TdNodeRecord[]);
	const [nodesStatus, setNodesStatus] = useState("");
	const [selectedNode, setSelectedNode] = useState(null as TdNodeRecord | null);
	const [paramsStatus, setParamsStatus] = useState("");
	const [busyKey, setBusyKey] = useState(null as string | null);

	const hasSelection = Boolean(selectedNode);

	const loadNodes = useCallback(async () => {
		setNodesStatus("読み込み中...");
		setSelectedNode(null);
		setParamsStatus("");
		try {
			const response = await callTool(TOOL_GET_NODES, {
				detailLevel: "detailed",
				parentPath: parentPath.trim() || "/project1",
				pattern: pattern.trim() || "*",
				responseFormat: "json",
			});
			const text = extractTextFromResponse(response);
			const data = JSON.parse(text) as { nodes?: TdNodeRecord[] };
			const list = Array.isArray(data.nodes) ? data.nodes : [];
			setNodes(list);
			setNodesStatus(list.length ? `${list.length}件取得` : "ノードなし");
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			setNodesStatus("取得に失敗しました");
		}
	}, [callTool, parentPath, pattern]);

	async function loadNodeDetails(path: string) {
		setParamsStatus("パラメータ取得中...");
		try {
			const response = await callTool(TOOL_GET_NODE_PARAMS, {
				detailLevel: "detailed",
				nodePath: path,
				responseFormat: "json",
			});
			const text = extractTextFromResponse(response);
			const data = JSON.parse(text) as TdNodeRecord;
			setSelectedNode(data);
			setParamsStatus("取得完了");
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			setParamsStatus("取得に失敗しました");
		}
	}

	async function handleUpdateParam(key: string, value: unknown) {
		if (!selectedNode) return;
		setBusyKey(key);
		setParamsStatus(`${key} 更新中...`);
		try {
			await callTool(TOOL_UPDATE_NODE_PARAMS, {
				detailLevel: "summary",
				nodePath: selectedNode.path,
				properties: { [key]: value },
			});
			setParamsStatus(`${key} を更新しました`);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error(error);
			setParamsStatus(`${key} の更新に失敗しました`);
		} finally {
			setBusyKey(null);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: 初回ロードのみ
	useEffect(() => {
		// 初回ロード
		loadNodes().catch((error: unknown) => {
			// eslint-disable-next-line no-console
			console.error(error);
		});
	}, []);

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
			<header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-50">
						TouchDesigner Node Browser
					</h1>
					<p className="text-sm text-slate-400">
						UIResource iframe + React + TailwindCSS
					</p>
				</div>
				<span className="inline-flex items-center rounded-full border border-blue-900/60 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100">
					React + mcp-ui
				</span>
			</header>

			<section className={panelClass}>
				<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
					<div className="space-y-1">
						<label className="text-xs text-slate-400">
							<span>Parent Path</span>
							<input
								className={inputClass}
								value={parentPath}
								onChange={(e: any) => setParentPath(e.target.value)}
								placeholder="/project1"
							/>
						</label>
					</div>
					<div className="space-y-1">
						<label className="text-xs text-slate-400">
							<span>Pattern</span>
							<input
								className={inputClass}
								value={pattern}
								onChange={(e: any) => setPattern(e.target.value)}
								placeholder="*"
							/>
						</label>
					</div>
					<div className="flex gap-2 md:justify-end">
						<button
							className={buttonClass}
							onClick={() => {
								loadNodes().catch((error: unknown) => {
									// eslint-disable-next-line no-console
									console.error(error);
								});
							}}
							type="button"
						>
							ノード取得
						</button>
					</div>
				</div>
				<div className="text-xs text-slate-400" data-testid="nodes-status">
					{nodesStatus || " "}
				</div>
				<div className="max-h-64 overflow-auto rounded-xl border border-slate-800 bg-slate-950/80">
					<TdNodeList
						nodes={nodes}
						selectedPath={selectedNode ? selectedNode.path : ""}
						onSelect={(node) => {
							setSelectedNode(node);
							loadNodeDetails(node.path).catch((error: unknown) => {
								// eslint-disable-next-line no-console
								console.error(error);
							});
						}}
					/>
				</div>
			</section>

			<section className={`${panelClass} space-y-4`}>
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="space-y-1">
						<h2 className="m-0 text-lg font-semibold text-slate-50">
							パラメータ
						</h2>
						<div className="text-sm text-slate-400" data-testid="selected-node">
							{hasSelection
								? `${selectedNode?.path ?? ""} (${selectedNode?.opType ?? "N/A"})`
								: "ノードを選択してください"}
						</div>
					</div>
					<button
						className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={!hasSelection}
						onClick={() => {
							if (selectedNode) {
								loadNodeDetails(selectedNode.path).catch((error: unknown) => {
									// eslint-disable-next-line no-console
									console.error(error);
								});
							}
						}}
						type="button"
					>
						再取得
					</button>
				</div>
				<div className="text-xs text-slate-400">{paramsStatus || " "}</div>
				{hasSelection ? (
					<ParamsList
						properties={selectedNode?.properties}
						onUpdate={handleUpdateParam}
						busyKey={busyKey}
					/>
				) : null}
			</section>
		</div>
	);
}

function typeOf(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

function bootstrap() {
	const rootEl = document.getElementById("td-node-browser-root");
	if (!rootEl) return;
	const initialParent = (
		rootEl.getAttribute("data-parent") ?? "/project1"
	).trim();
	const initialPattern = (rootEl.getAttribute("data-pattern") ?? "*").trim();
	const root = createRoot(rootEl);
	root.render(
		<NodeBrowserApp
			initialParent={initialParent}
			initialPattern={initialPattern}
		/>,
	);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrap);
} else {
	bootstrap();
}
