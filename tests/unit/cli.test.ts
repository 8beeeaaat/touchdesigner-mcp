import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStdioMode, parseArgs, startServer } from "../../src/cli.js";

// Mock dependencies
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: vi.fn().mockImplementation(() => ({
		// Mock transport implementation
	})),
}));

vi.mock("../../src/server/touchDesignerServer.js", () => ({
	TouchDesignerServer: vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue({ success: true }),
	})),
}));

describe("CLI", () => {
	describe("parseArgs functionality", () => {
		it("should parse host argument correctly", () => {
			expect(parseArgs(["--host=localhost"])).toEqual({
				host: "localhost",
				port: 9981,
			});
		});

		it("should parse port argument correctly", () => {
			expect(parseArgs(["--port=8080"])).toEqual({
				host: "http://localhost",
				port: 8080,
			});
		});

		it("should parse both host and port arguments", () => {
			expect(parseArgs(["--host=127.0.0.1", "--port=9090"])).toEqual({
				host: "127.0.0.1",
				port: 9090,
			});
		});

		it("should ignore malformed arguments", () => {
			expect(parseArgs(["--host", "--port"])).toEqual({
				host: "http://localhost",
				port: 9981,
			});
		});

		it("should handle invalid port number", () => {
			const result = parseArgs(["--port=invalid"]);
			expect(result.port).toBeNaN();
		});
	});

	describe("stdio mode detection", () => {
		it("should detect stdio mode correctly", () => {
			expect(isStdioMode("cli", ["node", "script.js", "args"])).toBe(true);
			expect(isStdioMode("", ["node", "script.js", "--stdio"])).toBe(true);
			expect(isStdioMode("", ["node", "script.js"])).toBe(false);
			expect(
				isStdioMode("", ["node", "script.js", "--stdio", "many", "args"]),
			).toBe(true);
		});
	});

	describe("startServer functionality", () => {
		beforeEach(() => {
			// Clear environment variables
			delete process.env.TD_WEB_SERVER_HOST;
			delete process.env.TD_WEB_SERVER_PORT;
		});

		afterEach(() => {
			vi.clearAllMocks();
			vi.restoreAllMocks();
		});

		it("should set environment variables from parsed arguments", async () => {
			await startServer({
				nodeEnv: "cli",
				argv: ["node", "cli.js", "--stdio", "--host=127.0.0.1", "--port=8080"],
			});

			expect(process.env.TD_WEB_SERVER_HOST).toBe("127.0.0.1");
			expect(process.env.TD_WEB_SERVER_PORT).toBe("8080");
		});

		it("should create TouchDesigner server and connect in stdio mode", async () => {
			const { TouchDesignerServer } = await import(
				"../../src/server/touchDesignerServer.js"
			);
			const { StdioServerTransport } = await import(
				"@modelcontextprotocol/sdk/server/stdio.js"
			);

			// Reset the mock to ensure it returns success
			const mockServer = {
				connect: vi.fn().mockResolvedValue({ success: true }),
			};
			vi.mocked(TouchDesignerServer).mockImplementation(
				() => mockServer as unknown as InstanceType<typeof TouchDesignerServer>,
			);

			await startServer({
				nodeEnv: "cli",
				argv: ["node", "cli.js", "--stdio", "--host=127.0.0.1", "--port=8080"],
			});

			expect(TouchDesignerServer).toHaveBeenCalled();
			expect(StdioServerTransport).toHaveBeenCalled();
		});

		it("should handle connection failure gracefully", async () => {
			const { TouchDesignerServer } = await import(
				"../../src/server/touchDesignerServer.js"
			);

			// Mock server connection to fail
			const mockServer = {
				connect: vi.fn().mockResolvedValue({
					success: false,
					error: { message: "Connection failed" },
				}),
			} as Partial<InstanceType<typeof TouchDesignerServer>>;

			vi.mocked(TouchDesignerServer).mockImplementation(
				() => mockServer as InstanceType<typeof TouchDesignerServer>,
			);

			await expect(
				startServer({
					nodeEnv: "cli",
					argv: [
						"node",
						"cli.js",
						"--stdio",
						"--host=127.0.0.1",
						"--port=8080",
					],
				}),
			).rejects.toThrow(
				"Failed to initialize server: Failed to connect: Connection failed",
			);
		});

		it("should handle unexpected errors gracefully", async () => {
			const { TouchDesignerServer } = await import(
				"../../src/server/touchDesignerServer.js"
			);

			// Mock server to throw an error
			vi.mocked(TouchDesignerServer).mockImplementation(() => {
				throw new Error("Unexpected error");
			});

			await expect(
				startServer({
					nodeEnv: "cli",
					argv: [
						"node",
						"cli.js",
						"--stdio",
						"--host=127.0.0.1",
						"--port=8080",
					],
				}),
			).rejects.toThrow("Failed to initialize server: Unexpected error");
		});

		it("should handle non-Error exceptions", async () => {
			const { TouchDesignerServer } = await import(
				"../../src/server/touchDesignerServer.js"
			);

			// Mock server to throw a non-Error object
			vi.mocked(TouchDesignerServer).mockImplementation(() => {
				throw "String error";
			});

			await expect(
				startServer({
					nodeEnv: "cli",
					argv: [
						"node",
						"cli.js",
						"--stdio",
						"--host=127.0.0.1",
						"--port=8080",
					],
				}),
			).rejects.toThrow("Failed to initialize server: String error");
		});

		it("should throw error for non-stdio mode", async () => {
			await expect(
				startServer({
					nodeEnv: "test",
					argv: ["node", "cli.js", "arg1", "arg2", "arg3"],
				}),
			).rejects.toThrow(
				"Failed to initialize server: Sorry, this server is not yet available in the browser. Please use the CLI mode.",
			);
		});
	});
});
