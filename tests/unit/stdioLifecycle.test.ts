import { afterEach, describe, expect, test, vi } from "vitest";

describe("installStdioLifecycleGuards", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		process.stdin.removeAllListeners("end");
		process.stdin.removeAllListeners("close");
		process.stdin.removeAllListeners("error");
	});

	test("exits on stdin end", async () => {
		const exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation((() => undefined) as never);
		const { installStdioLifecycleGuards } = await import(
			"../../src/core/stdioLifecycle.js"
		);
		installStdioLifecycleGuards({ parentPollMs: 60_000 });
		process.stdin.emit("end");
		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});
