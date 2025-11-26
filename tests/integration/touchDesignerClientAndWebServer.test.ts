import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { TdNode } from "../../src/gen/endpoints/TouchDesignerAPI";
import { TouchDesignerClient } from "../../src/tdClient/touchDesignerClient";

const PROJECT_PATH = "/project1";
const SANDBOX_NAME = "test_base_comp";
const SANDBOX_PATH = `${PROJECT_PATH}/${SANDBOX_NAME}`;
/**
 * Verify if a node exists
 */
async function verifyNodeExists(params: {
	client: TouchDesignerClient;
	nodeName: string;
}): Promise<boolean> {
	try {
		const response = await params.client.execNodeMethod<{
			result: TdNode[];
		}>({
			nodePath: SANDBOX_PATH,
			method: "ops",
			args: [params.nodeName],
			kwargs: {},
		});
		return response.success ? response.data.result.length > 0 : false;
	} catch (_err) {
		return false;
	}
}

const tdClient = new TouchDesignerClient();

describe("TouchDesigner Client E2E Tests", () => {
	beforeAll(async () => {
		process.env.TD_WEB_SERVER_HOST = "http://127.0.0.1";
		process.env.TD_WEB_SERVER_PORT = "9981";
		await tdClient.createNode({
			parentPath: PROJECT_PATH,
			nodeType: "baseCOMP",
			nodeName: SANDBOX_NAME,
		});
	});

	afterAll(async () => {
		await tdClient.deleteNode({ nodePath: SANDBOX_PATH });
	});

	test("TouchDesigner info endpoint should return server information", async () => {
		const response = await tdClient.getTdInfo();

		expect(response).toBeDefined();
		expect(response.success).toBe(true);
		if (response.success) {
			expect(response.data).toBeDefined();
		} else {
			expect.fail(`getTdInfo failed: ${response.error}`);
		}
	});

	test("Python classes list endpoint should return available classes", async () => {
		const response = await tdClient.getClasses();

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error(`failed: ${response.error}`);
		}
		expect(response.data).toBeDefined();
		expect(response.success).toBe(true);
		const classes = response.data.classes || [];
		const hasValidClass = classes.some(
			(c) => typeof c.name === "string" && c.name.length > 0,
		);
		expect(hasValidClass).toBe(true);
	});

	test("Python class details endpoint should return class structure", async () => {
		const classNames = ["OP", "op"];

		for (const className of classNames) {
			const response = await tdClient.getClassDetails(className);

			expect(response).toBeDefined();
			if (!response.success) {
				throw new Error(`failed: ${response.error}`);
			}
			expect(response.data).toBeDefined();
			expect(response.success).toBe(true);
			expect(response.data?.name).toBe(className);
		}
	});

	test("Node method execute should create a node", async () => {
		const parentPath = SANDBOX_PATH;
		const nodeType = "textTOP";
		const nodeName = `api_text_top_${Date.now()}`;
		const nodePath = `${parentPath}/${nodeName}`;

		const response = await tdClient.execNodeMethod({
			nodePath: parentPath,
			method: "create",
			args: [nodeType, nodeName],
			kwargs: { initialize: true },
		});

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error(`failed: ${response.error}`);
		}
		expect(response.data).toBeDefined();
		expect(response.success).toBe(true);
		const exists = await verifyNodeExists({
			client: tdClient,
			nodeName,
		});
		expect(exists).toBe(true);

		await tdClient.deleteNode({ nodePath });
	});

	test("Complete node update flow should work", async () => {
		const parentPath = SANDBOX_PATH;
		const nodeType = "textTOP";
		const nodeName = `test_update_${Date.now()}`;
		const nodePath = `${parentPath}/${nodeName}`;

		const createResponse = await tdClient.createNode({
			parentPath,
			nodeType,
			nodeName,
		});

		expect(createResponse).toBeDefined();
		if (!createResponse.success) {
			throw new Error(`failed: ${createResponse.error}`);
		}
		expect(createResponse.success).toBe(true);
		expect(createResponse.data?.result?.name).toBe(nodeName);

		const initialProps = await tdClient.getNodeDetail({
			nodePath,
		});

		expect(initialProps).toBeDefined();

		const updateProps = {
			text: "Updated via API!",
			fontsizex: 24,
		};

		const updateResponse = await tdClient.updateNode({
			nodePath,
			properties: updateProps,
		});

		expect(updateResponse).toBeDefined();
		if (!updateResponse.success) {
			throw new Error(`failed: ${updateResponse.error}`);
		}
		expect(updateResponse.success).toBe(true);
		expect(updateResponse.data?.updated).toBeInstanceOf(Array);
		expect(updateResponse.data?.updated).toContain("text");
		expect(updateResponse.data?.updated).toContain("fontsizex");

		const updatedProps = await tdClient.getNodeDetail({
			nodePath,
		});

		expect(updatedProps).toBeDefined();
		if (!updatedProps.success) {
			throw new Error(`failed: ${updatedProps.error}`);
		}
		expect(updatedProps.success).toBe(true);
		expect(updatedProps.data?.properties.fontsizex).toBe(updateProps.fontsizex);
		expect(updatedProps.data?.properties.text).toBe(updateProps.text);

		await tdClient.deleteNode({ nodePath });
	});

	test("Get nodes should return filtered nodes by pattern", async () => {
		const parentPath = SANDBOX_PATH;

		const testNodes = [
			{ type: "textTOP", name: `test_filter_a_${Date.now()}` },
			{ type: "textTOP", name: `test_filter_b_${Date.now() + 1}` },
		];

		for (const node of testNodes) {
			await tdClient.createNode({
				parentPath,
				nodeType: node.type,
				nodeName: node.name,
			});
		}

		const allNodesResponse = await tdClient.getNodes({
			parentPath,
		});

		expect(allNodesResponse).toBeDefined();
		if (!allNodesResponse.success) {
			throw new Error(`failed: ${allNodesResponse.error}`);
		}
		expect(allNodesResponse.success).toBe(true);
		expect(allNodesResponse.data?.nodes).toBeInstanceOf(Array);

		const filterPattern = "test_filter_*";
		const filteredNodesResponse = await tdClient.getNodes({
			parentPath,
			pattern: filterPattern,
		});

		expect(filteredNodesResponse).toBeDefined();
		if (!filteredNodesResponse.success) {
			throw new Error(`failed: ${filteredNodesResponse.error}`);
		}
		expect(filteredNodesResponse.success).toBe(true);
		expect(filteredNodesResponse.data?.nodes).toBeInstanceOf(Array);

		const filteredNodes = filteredNodesResponse.data?.nodes || [];
		expect(filteredNodes.length).toBeGreaterThanOrEqual(2);

		for (const node of filteredNodes) {
			expect(node.name.startsWith("test_filter_")).toBe(true);
		}

		for (const node of testNodes) {
			await tdClient.deleteNode({ nodePath: `${parentPath}/${node.name}` });
		}
	});

	test("Node creation and deletion should work correctly", async () => {
		const parentPath = SANDBOX_PATH;
		const nodeType = "constantTOP";
		const nodeName = `test_create_delete_${Date.now()}`;
		const nodePath = `${parentPath}/${nodeName}`;

		const createResponse = await tdClient.createNode({
			parentPath,
			nodeType,
			nodeName,
		});

		expect(createResponse).toBeDefined();
		if (!createResponse.success) {
			throw new Error(`failed: ${createResponse.error}`);
		}
		expect(createResponse.success).toBe(true);
		expect(createResponse.data?.result).toBeDefined();

		const exists = await verifyNodeExists({
			client: tdClient,
			nodeName,
		});
		expect(exists).toBe(true);

		const deleteResponse = await tdClient.deleteNode({
			nodePath,
		});

		expect(deleteResponse).toBeDefined();
		if (!deleteResponse.success) {
			throw new Error(`failed: ${deleteResponse.error}`);
		}
		expect(deleteResponse.success).toBe(true);
		expect(deleteResponse.data?.deleted).toBe(true);
		expect(deleteResponse.data?.node?.path).toBe(nodePath);

		const stillExists = await verifyNodeExists({
			client: tdClient,
			nodeName,
		});
		expect(stillExists).toBe(false);
	});

	test("Python script execution should create nodes", async () => {
		const nodeName = `exec_test_${Date.now()}`;
		const nodePath = `${SANDBOX_PATH}/${nodeName}`;

		const execResponse = await tdClient.execPythonScript<{
			result: TdNode;
		}>({
			script: `op('${SANDBOX_PATH}').create('nullDAT', '${nodeName}')`,
		});
		expect(execResponse).toBeDefined();
		if (!execResponse.success) {
			throw new Error(`failed: ${execResponse.error}`);
		}
		expect(execResponse.success).toBe(true);
		expect(execResponse.data).toBeDefined();

		const exists = await verifyNodeExists({
			client: tdClient,
			nodeName,
		});
		expect(exists).toBe(true);

		await tdClient.deleteNode({ nodePath });
	});

	test("Can catch errors", async () => {
		const nodeName = `exec_test_${Date.now()}`;
		const nodePath = `${SANDBOX_PATH}/${nodeName}`;

		const execResponse = await tdClient.execPythonScript({
			script: `op('${SANDBOX_PATH}').error()`,
		});
		expect(execResponse).toBeDefined();
		if (execResponse.success) {
			throw new Error(`failed: ${execResponse}`);
		}
		expect(execResponse.success).toBe(false);
		expect(execResponse.error).toStrictEqual(
			new Error(
				"Handler for 'exec_python_script' failed: OP attribute error is deprecated has been replaced by errors and addError.",
			),
		);

		await tdClient.deleteNode({ nodePath });
	});

	test("Node error check should return error lists", async () => {
		const response = await tdClient.checkNodeErrors({
			nodePath: SANDBOX_PATH,
		});

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error(`failed: ${response.error}`);
		}
		expect(response.success).toBe(true);
		expect(response.data).toBeDefined();
		expect(Array.isArray(response.data?.errors)).toBe(true);
	});

	test("add TOP errors should be detected by checkNodeErrors", async () => {
		const nodeName = "add_error";
		const _addNodePath = `${SANDBOX_PATH}/${nodeName}`;
		const parentPath = SANDBOX_PATH;
		const nodeType = "addTOP";

		const setupResponse = await tdClient.createNode({
			parentPath,
			nodeType,
			nodeName,
		});
		if (!setupResponse.success) {
			throw new Error(`failed: ${setupResponse.error}`);
		}

		// Force cook to trigger error detection
		const execResponse = await tdClient.execPythonScript<{
			result: TdNode;
		}>({
			script: `op('${SANDBOX_PATH}').cook(recurse=True)\n`,
		});
		expect(execResponse).toBeDefined();
		if (!execResponse.success) {
			throw new Error(`failed: ${execResponse.error}`);
		}
		expect(execResponse.success).toBe(true);

		const response = await tdClient.checkNodeErrors({
			nodePath: SANDBOX_PATH,
		});

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error(`failed: ${response.error}`);
		}

		const errors = response.data?.errors ?? [];
		expect(errors.length).toBeGreaterThan(0);
		expect(
			errors.some(
				(msg) =>
					typeof msg === "string" &&
					msg.includes("Error: Not enough sources specified"),
			),
		).toBe(true);
	});

	test("Module help should return documentation for TouchDesigner classes", async () => {
		// Test with common TouchDesigner class
		const response = await tdClient.getModuleHelp({
			moduleName: "noiseCHOP",
		});

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error("getModuleHelp failed");
		}
		expect(response.success).toBe(true);
		expect(response.data).toBeDefined();
		expect(response.data.moduleName).toBe("noiseCHOP");
		expect(response.data.helpText).toBeDefined();

		const { helpText } = response.data;
		if (!helpText) {
			throw new Error("helpText is undefined");
		}
		expect(helpText.length).toBeGreaterThan(0);
		expect(helpText).toContain("class noiseCHOP");
	});

	test("Module help should work with td. prefix", async () => {
		const response = await tdClient.getModuleHelp({
			moduleName: "td.noiseCHOP",
		});

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error("getModuleHelp failed");
		}
		expect(response.success).toBe(true);
		expect(response.data.moduleName).toBe("td.noiseCHOP");
		expect(response.data.helpText).toBeDefined();

		const { helpText } = response.data;
		if (!helpText) {
			throw new Error("helpText is undefined");
		}
		expect(helpText.length).toBeGreaterThan(0);
	});

	test("Module help should work with utility modules", async () => {
		const response = await tdClient.getModuleHelp({
			moduleName: "tdu",
		});

		expect(response).toBeDefined();
		if (!response.success) {
			throw new Error("getModuleHelp failed");
		}
		expect(response.success).toBe(true);
		expect(response.data.moduleName).toBe("tdu");
		expect(response.data.helpText).toBeDefined();

		const { helpText } = response.data;
		if (!helpText) {
			throw new Error("helpText is undefined");
		}
		expect(helpText.length).toBeGreaterThan(0);
		expect(helpText).toContain("TDU");
	});

	test("Module help should handle non-existent modules gracefully", async () => {
		const response = await tdClient.getModuleHelp({
			moduleName: "nonExistentModule123",
		});

		expect(response).toBeDefined();
		expect(response.success).toBe(false);
		if (response.success) {
			throw new Error("Expected failure for non-existent module");
		}
		// Error is available on ErrorResult type
	});
});
