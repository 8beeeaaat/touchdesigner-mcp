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

/** A single editable parameter the param editor renders as a form field. */
export interface EditorParam {
	name: string;
	kind: "string" | "number" | "boolean";
	value: string | number | boolean;
}

/** Shape of the structuredContent the ui_td_param_editor tool returns. */
export interface ParamEditorData {
	nodePath: string;
	params: EditorParam[];
}
