import { describe, expect, test } from "vitest";
import { TargetRegistry } from "../../src/core/targetRegistry.js";
import { LAB_TARGET_ID } from "../../src/core/targetTypes.js";

describe("stop lab refuse (registry contract)", () => {
	test("lab is builtin", () => {
		const reg = new TargetRegistry();
		expect(reg.get(LAB_TARGET_ID)?.source).toBe("builtin");
	});
});
