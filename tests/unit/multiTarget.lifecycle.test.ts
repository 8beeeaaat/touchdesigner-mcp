import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { rewriteTdApiUrl } from "../../src/api/customInstance.js";
import { createTdProject } from "../../src/core/lifecycle.js";
import { allocateTdMcpPort } from "../../src/core/portAllocator.js";
import { runWithTarget } from "../../src/core/targetContext.js";
import {
	TargetRegistry,
	resetTargetRegistryForTests,
} from "../../src/core/targetRegistry.js";
import { LAB_TARGET_ID } from "../../src/core/targetTypes.js";

describe("TargetRegistry", () => {
	beforeEach(() => {
		resetTargetRegistryForTests(new TargetRegistry());
	});

	test("defaults to lab selected", () => {
		const reg = new TargetRegistry();
		expect(reg.getSelectedId()).toBe(LAB_TARGET_ID);
		expect(reg.list()).toHaveLength(1);
	});

	test("select unknown throws", () => {
		const reg = new TargetRegistry();
		expect(() => reg.select("nope")).toThrow(/Unknown target/);
	});

	test("cannot stop/remove lab via removeOwned", () => {
		const reg = new TargetRegistry();
		expect(() => reg.removeOwned(LAB_TARGET_ID)).toThrow(/Cannot remove/);
	});

	test("upsert owned and select", () => {
		const reg = new TargetRegistry();
		reg.upsertOwned({
			host: "http://127.0.0.1",
			id: "owned-1",
			label: "t",
			port: 9984,
		});
		expect(reg.list()).toHaveLength(2);
		reg.select("owned-1");
		expect(reg.getSelected().port).toBe(9984);
		reg.removeOwned("owned-1");
		expect(reg.getSelectedId()).toBe(LAB_TARGET_ID);
	});
});

describe("ALS URL rewrite", () => {
	test("rewrites /api path to sticky origin", async () => {
		const fromAls = await runWithTarget(
			{ host: "http://127.0.0.1", id: "owned-1", port: 9984 },
			() => rewriteTdApiUrl("http://127.0.0.1:9981/api/td/server/td"),
		);
		expect(fromAls).toBe("http://127.0.0.1:9984/api/td/server/td");
	});

	test("parallel ALS contexts do not race", async () => {
		const results = await Promise.all([
			runWithTarget({ host: "http://127.0.0.1", id: "a", port: 9984 }, async () => {
				await new Promise((r) => setTimeout(r, 20));
				return rewriteTdApiUrl("http://x:1/api/nodes");
			}),
			runWithTarget({ host: "http://127.0.0.1", id: "b", port: 9985 }, async () => {
				await new Promise((r) => setTimeout(r, 5));
				return rewriteTdApiUrl("http://x:1/api/nodes");
			}),
		]);
		expect(results[0]).toBe("http://127.0.0.1:9984/api/nodes");
		expect(results[1]).toBe("http://127.0.0.1:9985/api/nodes");
	});
});

describe("port allocator", () => {
	test("skips 9982 and 9983", async () => {
		// Occupy 9984 so allocator must move; ensure result not 9982/9983
		const blockers: ReturnType<typeof createServer>[] = [];
		try {
			for (const p of [9984, 9985]) {
				const s = createServer();
				await new Promise<void>((resolve, reject) => {
					s.once("error", reject);
					s.listen(p, "127.0.0.1", () => resolve());
				});
				blockers.push(s);
			}
			const port = await allocateTdMcpPort(9982);
			expect(port).toBeGreaterThanOrEqual(9984);
			expect(port).not.toBe(9982);
			expect(port).not.toBe(9983);
		} finally {
			await Promise.all(
				blockers.map(
					(s) =>
						new Promise<void>((resolve) => {
							s.close(() => resolve());
						}),
				),
			);
		}
	});
});

describe("createTdProject", () => {
	let dest = "";
	afterEach(() => {
		if (dest) {
			try {
				rmSync(dest, { recursive: true, force: true });
			} catch {
				// ignore
			}
		}
	});

	test("copies template and writes state", async () => {
		dest = mkdtempSync(join(tmpdir(), "tdmcp-create-"));
		const inner = join(dest, "proj");
		const result = await createTdProject({ destDir: inner, port: 9991 });
		expect(result.port).toBe(9991);
		expect(result.targetId.startsWith("owned-")).toBe(true);
		const state = JSON.parse(
			readFileSync(join(inner, ".tdmcp", "state.json"), "utf8"),
		);
		expect(state.port).toBe(9991);
		expect(state.targetId).toBe(result.targetId);
	});

	test("refuses non-empty dest", async () => {
		dest = mkdtempSync(join(tmpdir(), "tdmcp-create-"));
		const inner = join(dest, "proj");
		await createTdProject({ destDir: inner, port: 9992 });
		await expect(
			createTdProject({ destDir: inner, port: 9993 }),
		).rejects.toThrow(/not empty/);
	});
});
