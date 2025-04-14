const CheckNode = {
	name: "check-node",
	description: "Fuzzy search for node",
	arguments: [
		{
			name: "nodeName",
			description: "Path to the node to check",
			required: true,
		},
		{
			name: "nodeFamily",
			description: "Family of the node to check",
			required: false,
		},
		{
			name: "nodeType",
			description: "Type of the node to check",
			required: false,
		},
	],
	getMessages: (params: {
		nodeName: string;
		nodeFamily?: string;
		nodeType?: string;
	}) => {
		return [
			{
				role: "user",
				content: {
					type: "text",
					text: `Use the "get_td_project_nodes", "get_td_node_property" tool to check nodes what named "${params.nodeName}" in the TouchDesigner project.${
						params.nodeType ? ` Node Type: ${params.nodeType}.` : ""
					}${params.nodeFamily ? ` Node Family: ${params.nodeFamily}.` : ""}`,
				},
			},
		];
	},
};

export { CheckNode };
