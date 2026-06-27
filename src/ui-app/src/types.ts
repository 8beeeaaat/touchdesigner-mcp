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
