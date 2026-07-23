import { describe, expect, it, vi } from "vitest";
import type {
	TdUiDialog,
	TdUiInspectResult,
} from "../../src/lifecycle/tdDialogs.js";
import { waitForBridgeWithDialogs } from "../../src/lifecycle/tdProcess.js";

const hardDialog: TdUiDialog = {
	message: "Unexpected node duplication (/project1/x) in file.",
	severity: "hard",
	title: "/project1/x",
};

describe("waitForBridgeWithDialogs", () => {
	it("accumulates dismissedDialogs then succeeds", async () => {
		let inspectCalls = 0;
		const inspect = vi.fn(async (): Promise<TdUiInspectResult> => {
			inspectCalls += 1;
			if (inspectCalls === 1) {
				return {
					dialogs: [hardDialog],
					mainWindowTitle: hardDialog.title,
					responding: true,
				};
			}
			return { dialogs: [], mainWindowTitle: "ok", responding: true };
		});
		const dismissAll = vi.fn(async (dialogs: TdUiDialog[]) => ({
			attempted: dialogs,
			dismissed: dialogs,
		}));
		const probe = vi
			.fn()
			.mockRejectedValueOnce(new Error("ECONNREFUSED"))
			.mockResolvedValueOnce({ osPid: 42, projectName: "p" });

		const result = await waitForBridgeWithDialogs({
			deadlineMs: Date.now() + 30_000,
			deps: {
				dismissAll,
				inspect,
				inspectLight: inspect,
				probe,
				sleepMs: async () => undefined,
			},
			pid: 99,
		});

		expect(result.identity.osPid).toBe(42);
		expect(result.dismissedDialogs.length).toBeGreaterThanOrEqual(1);
		expect(result.dismissedDialogs[0]?.title).toBe("/project1/x");
		expect(dismissAll).toHaveBeenCalled();
	});

	it("returns empty dismissedDialogs on clean start", async () => {
		const inspect = vi.fn(
			async (): Promise<TdUiInspectResult> => ({
				dialogs: [],
				mainWindowTitle: "TouchDesigner 2025: x.toe",
				responding: true,
			}),
		);
		const dismissAll = vi.fn(async () => ({
			attempted: [] as TdUiDialog[],
			dismissed: [] as TdUiDialog[],
		}));
		const result = await waitForBridgeWithDialogs({
			deadlineMs: Date.now() + 5_000,
			deps: {
				dismissAll,
				inspect,
				inspectLight: inspect,
				probe: async () => ({ osPid: 1 }),
				sleepMs: async () => undefined,
			},
			pid: 1,
		});
		expect(result.dismissedDialogs).toEqual([]);
		expect(dismissAll).not.toHaveBeenCalled();
	});

	it("timeout error includes uiSnapshot responding/dialogs", async () => {
		const inspect = vi.fn(
			async (): Promise<TdUiInspectResult> => ({
				dialogs: [hardDialog],
				mainWindowTitle: hardDialog.title,
				responding: false,
			}),
		);
		await expect(
			waitForBridgeWithDialogs({
				deadlineMs: Date.now() + 50,
				deps: {
					dismissAll: async (dialogs) => ({
						attempted: dialogs,
						dismissed: dialogs,
					}),
					inspect,
					inspectLight: inspect,
					probe: async () => {
						throw new Error("down");
					},
					sleepMs: async () => undefined,
				},
				pid: 1,
			}),
		).rejects.toThrow(/uiSnapshot=.*"responding":false/);
	});

	it("never asks dismiss for TouchDesigner-only inspect (blocked at parse)", async () => {
		const inspect = vi.fn(
			async (): Promise<TdUiInspectResult> => ({
				dialogs: [],
				mainWindowTitle: "TouchDesigner",
				responding: true,
			}),
		);
		const dismissAll = vi.fn(async () => ({
			attempted: [] as TdUiDialog[],
			dismissed: [] as TdUiDialog[],
		}));
		await waitForBridgeWithDialogs({
			deadlineMs: Date.now() + 5_000,
			deps: {
				dismissAll,
				inspect,
				inspectLight: inspect,
				probe: async () => ({ ok: true }),
				sleepMs: async () => undefined,
			},
			pid: 1,
		});
		expect(dismissAll).not.toHaveBeenCalled();
	});
});
