import { describe, expect, it, vi } from "vitest";
import { TOOL_NAMES } from "../../src/core/constants.js";
import type { ILogger } from "../../src/core/logger.js";
import { TOOL_DEFINITIONS } from "../../src/features/tools/toolDefinitions.js";
import type { TouchDesignerClient } from "../../src/tdClient/touchDesignerClient.js";

const nullLogger: ILogger = {
	sendLog: () => {},
};

function getDefinition() {
	const definition = TOOL_DEFINITIONS.find(
		(d) => d.name === TOOL_NAMES.GET_TOP_IMAGE,
	);
	if (!definition) {
		throw new Error("get_top_image tool definition not found");
	}
	return definition;
}

describe("get_top_image tool definition", () => {
	it("is registered with a nodePath-only + maxSize schema", () => {
		const definition = getDefinition();
		expect(definition.category).toBe("nodes");
		const shape = definition.schema.shape;
		expect(Object.keys(shape).sort()).toEqual(["maxSize", "nodePath"]);
	});

	it("returns an image content block built from the base64 script result", async () => {
		const definition = getDefinition();
		const execPythonScript = vi.fn().mockResolvedValue({
			data: { result: "ZmFrZS1qcGVnLWJ5dGVz" },
			success: true,
		});
		const tdClient = {
			execPythonScript,
		} as unknown as TouchDesignerClient;

		const output = await definition.run({
			logger: nullLogger,
			params: { maxSize: 512, nodePath: "/project1/top1" },
			tdClient,
		});

		expect(execPythonScript).toHaveBeenCalledTimes(1);
		const [{ script }] = execPythonScript.mock.calls[0] as [{ script: string }];
		expect(script).toContain('node_path = "/project1/top1"');
		expect(script).toContain("max_size = 512");

		if (typeof output === "string") {
			throw new Error("expected a content block result, got a string");
		}
		expect(output.content).toEqual([
			{
				data: "ZmFrZS1qcGVnLWJ5dGVz",
				mimeType: "image/jpeg",
				type: "image",
			},
			{
				text: "Captured TOP image from /project1/top1 (maxSize=512px).",
				type: "text",
			},
		]);
	});

	it("throws the underlying error when execPythonScript fails", async () => {
		const definition = getDefinition();
		const tdClient = {
			execPythonScript: vi.fn().mockResolvedValue({
				error: new Error("Node not found at path: /project1/missing"),
				success: false,
			}),
		} as unknown as TouchDesignerClient;

		await expect(
			definition.run({
				logger: nullLogger,
				params: { nodePath: "/project1/missing" },
				tdClient,
			}),
		).rejects.toThrow("Node not found at path: /project1/missing");
	});

	it("throws a clear error when the script result is not a base64 string", async () => {
		const definition = getDefinition();
		const tdClient = {
			execPythonScript: vi.fn().mockResolvedValue({
				data: { result: null },
				success: true,
			}),
		} as unknown as TouchDesignerClient;

		await expect(
			definition.run({
				logger: nullLogger,
				params: { nodePath: "/project1/top1" },
				tdClient,
			}),
		).rejects.toThrow(/expected a base64 string result/);
	});
});
