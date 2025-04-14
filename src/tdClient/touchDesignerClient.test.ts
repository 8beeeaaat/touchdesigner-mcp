import { http, HttpResponse } from "msw";
import { NodeFamilyType } from "src/gen/models/nodeFamilyType.js";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { initMocks } from "../mock/index.js";
import { node } from "../mock/node.js";
import type { ILogger } from "../util.js";
import { TouchDesignerClient } from "./touchDesignerClient.js";

beforeAll(async () => {
	await initMocks();
});

afterAll(() => {
	node.close();
});

afterEach(() => {
	node.resetHandlers();
	vi.restoreAllMocks();
});

describe("TouchDesignerClient with MSW", () => {
	let client: TouchDesignerClient;
	const mockLog = vi.fn();
	const mockDebug = vi.fn();
	const mockError = vi.fn();
	const mockWarn = vi.fn();

	const mockLogger: ILogger = {
		log: mockLog,
		debug: mockDebug,
		error: mockError,
		warn: mockWarn,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		client = new TouchDesignerClient(mockLogger);
	});

	it("should get server info correctly", async () => {
		const mockServerInfo = {
			server: "TouchDesigner 2023.11380",
			version: "2023.11380",
			status: "running",
		};

		node.use(
			http.get("*/api/server", () => {
				return HttpResponse.json(mockServerInfo, { status: 200 });
			}),
		);

		const result = await client.getServerInfo();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockServerInfo);
		} else {
			throw new Error("Expected success result");
		}
	});

	it("should get project nodes correctly", async () => {
		const mockNodes = {
			projectNodes: [
				{
					id: 1,
					name: "node1",
					path: "/project1/node1",
					type: "base",
					opType: "base",
					family: NodeFamilyType.COMP,
					parameters: {},
					node: {},
				},
				{
					id: 2,
					name: "node2",
					path: "/project1/node2",
					type: "container",
					opType: "container",
					family: NodeFamilyType.COMP,
					parameters: {},
					node: {},
				},
			],
		};

		node.use(
			http.get("*/api/nodes", () => {
				return HttpResponse.json(mockNodes, { status: 200 });
			}),
		);

		const result = await client.getProjectNodes();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockNodes);
		} else {
			throw new Error("Expected success result");
		}
	});

	it("should get node property correctly", async () => {
		const nodePath = "project1/testNode";

		const mockNodeProperty = {
			id: 1,
			name: "testNode",
			path: nodePath,
			type: "base",
			opType: "base",
			family: NodeFamilyType.COMP,
			parameters: {},
			node: {},
		};

		node.use(
			http.get(`*/api/nodes/${nodePath}`, ({ params }) => {
				return HttpResponse.json(mockNodeProperty, { status: 200 });
			}),
		);

		const result = await client.getNodeProperty(nodePath);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockNodeProperty);
		} else {
			throw new Error("Expected success result");
		}
	});

	it("should create node correctly", async () => {
		const newNodeInfo = {
			nodeName: "newNode",
			nodeFamily: NodeFamilyType.COMP,
			nodeType: "base",
		};

		const mockCreateResponse = {
			message: "Node created successfully",
			node: {
				id: 1,
				name: "newNode",
				path: "/project1/newNode",
				type: "base",
				opType: "base",
				family: NodeFamilyType.COMP,
				parameters: {},
				node: {},
			},
		};

		node.use(
			http.post("*/api/nodes", async ({ request }) => {
				const requestBody = await request.json();
				expect(requestBody).toEqual(newNodeInfo);
				return HttpResponse.json(mockCreateResponse, { status: 201 });
			}),
		);

		const result = await client.createNode(newNodeInfo);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockCreateResponse);
		} else {
			throw new Error("Expected success result");
		}
	});

	it("should update node correctly", async () => {
		const nodePath = "/project1/updateNode";
		const updateInfo = {
			nodePath,
			parameters: {
				opacity: 0.5,
				position: [10, 20],
			},
		};

		const mockUpdateResponse = {
			message: "Node updated successfully",
			node: {
				name: "updatedNode",
				path: nodePath,
			},
			nodeInfo: {
				id: 1,
				name: "updatedNode",
				path: nodePath,
			},
			warnings: [],
		};

		node.use(
			http.patch(`*/api/nodes/${nodePath}`, async ({ request }) => {
				const requestBody = await request.json();
				expect(requestBody).toEqual({
					parameters: updateInfo.parameters,
				});
				return HttpResponse.json(mockUpdateResponse, { status: 200 });
			}),
		);

		const result = await client.updateNode(updateInfo);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockUpdateResponse);
		} else {
			throw new Error("Expected success result");
		}
	});

	it("should delete node correctly", async () => {
		const deleteNodePath = "project1/nodeToDelete";

		const mockDeleteResponse = {
			message: "Node deleted successfully",
			nodePath: deleteNodePath,
		};

		node.use(
			http.delete(`*/api/nodes/${deleteNodePath}`, () => {
				return HttpResponse.json(mockDeleteResponse, { status: 200 });
			}),
		);

		const result = await client.deleteNode(deleteNodePath);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockDeleteResponse);
		} else {
			throw new Error("Expected success result");
		}
		expect(mockDebug).toHaveBeenCalledWith(
			`Node deletion for 'project1/nodeToDelete' succeeded`,
		);
	});

	it("should get node type default parameters correctly", async () => {
		const paramsRequest = {
			nodeFamily: "COMP" as NodeFamilyType,
			nodeType: "base",
		};

		const mockDefaultParams = {
			width: 1,
			height: 1,
			color: [1, 1, 1, 1],
		};

		const urlParamsChecker = vi.fn();

		node.use(
			http.get("*/api/nodes/default-parameters", ({ request }) => {
				const url = new URL(request.url);
				const nodeFamily = url.searchParams.get("nodeFamily");
				const nodeType = url.searchParams.get("nodeType");

				urlParamsChecker(nodeFamily, nodeType);

				expect(nodeFamily).toBe(paramsRequest.nodeFamily);
				expect(nodeType).toBe(paramsRequest.nodeType);

				return HttpResponse.json(mockDefaultParams, { status: 200 });
			}),
		);

		const result = await client.getNodeTypeDefaultParameters(paramsRequest);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(mockDefaultParams);
		} else {
			throw new Error("Expected success result");
		}
		expect(urlParamsChecker).toHaveBeenCalledWith("COMP", "base");
	});

	it("should handle network errors", async () => {
		node.use(
			http.get("*", () => {
				return HttpResponse.error();
			}),
		);

		const result = await client.getServerInfo();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(Error);
		} else {
			throw new Error("Expected failure result");
		}

		expect(mockError).toHaveBeenCalledWith(
			expect.stringContaining("Server info retrieval"),
			expect.any(Error),
		);
	});
});
