import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStdioMode, parseArgs, startServer } from "../../src/cli.js";

const {
	connectMock,
	defaultTouchDesignerServerImpl,
	defaultStdioTransportImpl,
	TouchDesignerServerMock,
	StdioServerTransportMock,
} = vi.hoisted(() => {
	const connectMock = vi.fn();

	const defaultTouchDesignerServerImpl =
		function MockTouchDesignerServer(this: {
			connect: typeof connectMock;
		}) {
			this.connect = connectMock;
		};
	const TouchDesignerServerMock = vi.fn(defaultTouchDesignerServerImpl);

	const defaultStdioTransportImpl = function MockStdioServerTransport() {};
	const StdioServerTransportMock = vi.fn(defaultStdioTransportImpl);

	return {
		connectMock,
		defaultStdioTransportImpl,
		defaultTouchDesignerServerImpl,
		StdioServerTransportMock,
		TouchDesignerServerMock,
	};
});

// Mock dependencies
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: StdioServerTransportMock,
}));

vi.mock("../../src/server/touchDesignerServer.js", () => ({
	TouchDesignerServer: TouchDesignerServerMock,
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
				host: "http://127.0.0.1",
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
				host: "http://127.0.0.1",
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

			connectMock.mockReset();
			connectMock.mockResolvedValue({ success: true });

			TouchDesignerServerMock.mockReset();
			TouchDesignerServerMock.mockImplementation(
				defaultTouchDesignerServerImpl,
			);

			StdioServerTransportMock.mockReset();
			StdioServerTransportMock.mockImplementation(defaultStdioTransportImpl);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it("should set environment variables from parsed arguments", async () => {
			await startServer({
				argv: ["node", "cli.js", "--stdio", "--host=127.0.0.1", "--port=8080"],
				nodeEnv: "cli",
			});

			expect(process.env.TD_WEB_SERVER_HOST).toBe("127.0.0.1");
			expect(process.env.TD_WEB_SERVER_PORT).toBe("8080");
		});

		it("should create TouchDesigner server and connect in stdio mode", async () => {
			await startServer({
				argv: ["node", "cli.js", "--stdio", "--host=127.0.0.1", "--port=8080"],
				nodeEnv: "cli",
			});

			expect(TouchDesignerServerMock).toHaveBeenCalled();
			expect(StdioServerTransportMock).toHaveBeenCalled();
			expect(connectMock).toHaveBeenCalled();
		});

		it("should handle connection failure gracefully", async () => {
			connectMock.mockResolvedValue({
				error: { message: "Connection failed" },
				success: false,
			});

			await expect(
				startServer({
					argv: [
						"node",
						"cli.js",
						"--stdio",
						"--host=127.0.0.1",
						"--port=8080",
					],
					nodeEnv: "cli",
				}),
			).rejects.toThrow(
				"Failed to initialize server: Failed to connect: Connection failed",
			);
		});

		it("should handle unexpected errors gracefully", async () => {
			TouchDesignerServerMock.mockImplementation(function ThrowingServer() {
				throw new Error("Unexpected error");
			});

			await expect(
				startServer({
					argv: [
						"node",
						"cli.js",
						"--stdio",
						"--host=127.0.0.1",
						"--port=8080",
					],
					nodeEnv: "cli",
				}),
			).rejects.toThrow("Failed to initialize server: Unexpected error");
		});

		it("should handle non-Error exceptions", async () => {
			TouchDesignerServerMock.mockImplementation(function ThrowingServer() {
				throw "String error";
			});

			await expect(
				startServer({
					argv: [
						"node",
						"cli.js",
						"--stdio",
						"--host=127.0.0.1",
						"--port=8080",
					],
					nodeEnv: "cli",
				}),
			).rejects.toThrow("Failed to initialize server: String error");
		});

		it("should throw error for non-stdio mode", async () => {
			await expect(
				startServer({
					argv: ["node", "cli.js", "arg1", "arg2", "arg3"],
					nodeEnv: "test",
				}),
			).rejects.toThrow(
				"Failed to initialize server: Sorry, this server is not yet available in the browser. Please use the CLI mode.",
			);
		});
	});
});
