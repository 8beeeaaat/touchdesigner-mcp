import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs, parseTransportConfig, startServer } from "../../src/cli.js";

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

	describe("parseTransportConfig functionality", () => {
		it("should default to stdio mode when no HTTP args provided", () => {
			const config = parseTransportConfig([]);
			expect(config.type).toBe("stdio");
		});

		it("should parse HTTP mode when --mcp-http-port is provided", () => {
			const config = parseTransportConfig(["--mcp-http-port=3000"]);
			expect(config.type).toBe("streamable-http");
			if (config.type === "streamable-http") {
				expect(config.port).toBe(3000);
				expect(config.host).toBe("127.0.0.1");
				expect(config.endpoint).toBe("/mcp");
			}
		});

		it("should use custom host when --mcp-http-host is provided", () => {
			const config = parseTransportConfig([
				"--mcp-http-port=3000",
				"--mcp-http-host=localhost",
			]);
			if (config.type === "streamable-http") {
				expect(config.host).toBe("localhost");
			}
		});

		it("should exit with error for non-numeric port value", () => {
			const mockExit = vi
				.spyOn(process, "exit")
				.mockImplementation(() => undefined as never);
			const mockConsoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			parseTransportConfig(["--mcp-http-port=abc"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining('Invalid value for --mcp-http-port: "abc"'),
			);
			expect(mockExit).toHaveBeenCalledWith(1);

			mockExit.mockRestore();
			mockConsoleError.mockRestore();
		});

		it("should exit with error for port number below valid range", () => {
			const mockExit = vi
				.spyOn(process, "exit")
				.mockImplementation(() => undefined as never);
			const mockConsoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			parseTransportConfig(["--mcp-http-port=0"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining('Invalid value for --mcp-http-port: "0"'),
			);
			expect(mockExit).toHaveBeenCalledWith(1);

			mockExit.mockRestore();
			mockConsoleError.mockRestore();
		});

		it("should exit with error for port number above valid range", () => {
			const mockExit = vi
				.spyOn(process, "exit")
				.mockImplementation(() => undefined as never);
			const mockConsoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			parseTransportConfig(["--mcp-http-port=70000"]);

			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining('Invalid value for --mcp-http-port: "70000"'),
			);
			expect(mockExit).toHaveBeenCalledWith(1);

			mockExit.mockRestore();
			mockConsoleError.mockRestore();
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
	});
});
