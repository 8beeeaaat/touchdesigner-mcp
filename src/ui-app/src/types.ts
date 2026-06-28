/**
 * Shape of the structuredContent the ui_td_node_browser tool returns.
 * Kept intentionally minimal — only what the browser UI renders.
 */
export interface NodeBrowserData {
	parentPath: string;
	nodes: BrowserNode[];
}

export interface BrowserNode {
	name: string;
	path: string;
	opType: string;
}

/** Host color theme, mirrored from getHostContext().theme. */
export type Theme = "light" | "dark";

/**
 * A single parameter spec the editor renders. Mirrors the server's TdParSpec
 * (src/api/components/schemas/TdParSpec.yml); ui-app is a separate package so
 * the type is re-declared here rather than imported.
 */
export interface ParSpec {
	name: string;
	label: string;
	page: string;
	/** TD parameter style: Float, Int, Toggle, Pulse, Menu, StrMenu, Str, … */
	style: string;
	value: string | number | boolean;
	default?: string | number | boolean;
	min?: number | null;
	max?: number | null;
	clampMin?: boolean;
	clampMax?: boolean;
	menuNames?: string[] | null;
	menuLabels?: string[] | null;
	readOnly?: boolean;
	enabled?: boolean;
}

/** Shape of the structuredContent the ui_td_param_editor tool returns. */
export interface ParamEditorData {
	nodePath: string;
	nodeName: string;
	opType: string;
	pars: ParSpec[];
}
