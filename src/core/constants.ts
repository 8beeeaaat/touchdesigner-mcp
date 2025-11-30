/**
 * Reference URLs for TouchDesigner Python documentation
 */
export const TD_PYTHON_CLASS_REFERENCE_BASE_URL = "https://docs.derivative.ca";
export const TD_PYTHON_CLASS_REFERENCE_INDEX_URL = `${TD_PYTHON_CLASS_REFERENCE_BASE_URL}/Python_Classes_and_Modules`;

/**
 * Reference Tool Names for TouchDesigner MCP
 */
export const TOOL_NAMES = {
	CREATE_TD_NODE: "create_td_node",
	DELETE_TD_NODE: "delete_td_node",
	DESCRIBE_TD_TOOLS: "describe_td_tools",
	EXECUTE_NODE_METHOD: "exec_node_method",
	EXECUTE_PYTHON_SCRIPT: "execute_python_script",
	GET_TD_CLASS_DETAILS: "get_td_class_details",
	GET_TD_CLASSES: "get_td_classes",
	GET_TD_INFO: "get_td_info",
	GET_TD_MODULE_HELP: "get_td_module_help",
	GET_TD_NODE_PARAMETERS: "get_td_node_parameters",
	GET_TD_NODES: "get_td_nodes",
	UPDATE_TD_NODE_PARAMETERS: "update_td_node_parameters",
} as const;

export const REFERENCE_COMMENT = `Check reference resources: ${TD_PYTHON_CLASS_REFERENCE_INDEX_URL}`;

export const PROMPT_NAMES = {
	CHECK_NODE_ERRORS: "Check node errors",
	NODE_CONNECTION: "Node connection",
	SEARCH_NODE: "Search node",
} as const;
