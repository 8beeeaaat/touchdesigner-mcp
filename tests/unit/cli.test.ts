import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs, parseTransportConfig, startServer } from "../../src/cli.js";

const {
	createTouchDesignerClientMock,
	defaultServeStdioImpl,
	ExpressHttpManagerMock,
	httpManagerStartMock,
	httpManagerStopMock,
	serveStdioMock,
	sharedTdClient,
	TouchDesignerServerCreateMock,
} = vi.hoisted(() => {
	const defaultServeStdioImpl = () => ({ close: vi.fn() });
	const serveStdioMock = vi.fn(defaultServeStdioImpl);
	const TouchDesignerServerCreateMock = vi.fn(() => ({}));
	const sharedTdClient = { kind: "shared TouchDesigner client" };
	const createTouchDesignerClientMock = vi.fn(() => sharedTdClient);
	const httpManagerStartMock = vi
		.fn()
		.mockResolvedValue({ data: undefined, success: true });
	const httpManagerStopMock = vi
		.fn()
		.mockResolvedValue({ data: undefined, success: true });
	const ExpressHttpManagerMock = vi.fn(function MockExpressHttpManager(
		this: Record<string, unknown>,
	) {
		this.start = httpManagerStartMock;
		this.stop = httpManagerStopMock;
	});

	return {
		createTouchDesignerClientMock,
		defaultServeStdioImpl,
		ExpressHttpManagerMock,
		httpManagerStartMock,
		httpManagerStopMock,
		serveStdioMock,
		sharedTdClient,
		TouchDesignerServerCreateMock,
	};
});

// Mock dependencies
vi.mock("@modelcontextprotocol/server/stdio", () => ({
	serveStdio: serveStdioMock,
}));

vi.mock("../../src/server/touchDesignerServer.js", () => ({
	TouchDesignerServer: { create: TouchDesignerServerCreateMock },
}));

vi.mock("../../src/tdClient/index.js", () => ({
	createTouchDesignerClient: createTouchDesignerClientMock,
}));

vi.mock("../../src/transport/expressHttpManager.js", () => ({
	ExpressHttpManager: ExpressHttpManagerMock,
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

		it("should exit with error for an invalid --port value", () => {
			for (const value of ["invalid", "0", "70000"]) {
				const mockExit = vi
					.spyOn(process, "exit")
					.mockImplementation(() => undefined as never);
				const mockConsoleError = vi
					.spyOn(console, "error")
					.mockImplementation(() => {});

				parseArgs([`--port=${value}`]);

				expect(mockConsoleError).toHaveBeenCalledWith(
					expect.stringContaining(`Invalid value for --port: "${value}"`),
				);
				expect(mockExit).toHaveBeenCalledWith(1);

				mockExit.mockRestore();
				mockConsoleError.mockRestore();
			}
		});

		it("should warn about an unrecognized flag instead of discarding it", () => {
			const mockConsoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			// A typo like this used to silently fall back to the default port.
			expect(parseArgs(["--prot=9981"])).toEqual({
				host: "http://127.0.0.1",
				port: 9981,
			});
			expect(mockConsoleError).toHaveBeenCalledWith(
				expect.stringContaining('ignoring unrecognized argument "--prot=9981"'),
			);

			mockConsoleError.mockRestore();
		});

		it("should not warn about flags parseTransportConfig owns", () => {
			const mockConsoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			parseArgs(["--mcp-http-port=6280", "--mcp-http-host=127.0.0.1"]);

			expect(mockConsoleError).not.toHaveBeenCalled();
			mockConsoleError.mockRestore();
		});
	});

	describe("parseTransportConfig functionality", () => {
		it("should default to stdio mode when no HTTP args provided", () => {
			const config = parseTransportConfig([]);
			expect(config.type).toBe("stdio");
		});

		it("should parse HTTP mode when --mcp-http-port is provided", () => {
			const config = parseTransportConfig(["--mcp-http-port=6280"]);
			expect(config.type).toBe("streamable-http");
			if (config.type === "streamable-http") {
				expect(config.port).toBe(6280);
				expect(config.host).toBe("127.0.0.1");
				expect(config.endpoint).toBe("/mcp");
			}
		});

		it("should use custom host when --mcp-http-host is provided", () => {
			const config = parseTransportConfig([
				"--mcp-http-port=6280",
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

			serveStdioMock.mockReset();
			serveStdioMock.mockImplementation(defaultServeStdioImpl);

			TouchDesignerServerCreateMock.mockReset();
			TouchDesignerServerCreateMock.mockImplementation(() => ({}));
			createTouchDesignerClientMock.mockClear();
			ExpressHttpManagerMock.mockClear();
			httpManagerStartMock.mockClear();
			httpManagerStopMock.mockClear();

			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should set environment variables from parsed arguments", async () => {
			await startServer({
				argv: ["node", "cli.js", "--host=127.0.0.1", "--port=8080"],
				nodeEnv: "cli",
			});

			expect(process.env.TD_WEB_SERVER_HOST).toBe("127.0.0.1");
			expect(process.env.TD_WEB_SERVER_PORT).toBe("8080");
		});

		it("should call serveStdio with a server factory in stdio mode", async () => {
			await startServer({
				argv: ["node", "cli.js", "--host=127.0.0.1", "--port=8080"],
				nodeEnv: "cli",
			});

			expect(serveStdioMock).toHaveBeenCalledTimes(1);
			expect(serveStdioMock).toHaveBeenCalledWith(expect.any(Function));

			// The factory is invoked per connection, not eagerly by startServer;
			// invoking it here confirms it is wired to TouchDesignerServer.create().
			const factory = serveStdioMock.mock.calls[0][0] as () => unknown;
			factory();
			expect(TouchDesignerServerCreateMock).toHaveBeenCalledTimes(1);
		});

		it("should reuse one TouchDesigner client across HTTP server instances", async () => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			vi.spyOn(process, "on").mockImplementation(() => process);

			await startServer({
				argv: [
					"node",
					"cli.js",
					"--mcp-http-port=6280",
					"--host=127.0.0.1",
					"--port=9981",
				],
				nodeEnv: "cli",
			});

			expect(createTouchDesignerClientMock).toHaveBeenCalledTimes(1);
			const serverFactory = ExpressHttpManagerMock.mock
				.calls[0][1] as () => unknown;

			serverFactory();
			serverFactory();

			expect(TouchDesignerServerCreateMock).toHaveBeenCalledTimes(2);
			expect(TouchDesignerServerCreateMock).toHaveBeenNthCalledWith(1, {
				tdClient: sharedTdClient,
			});
			expect(TouchDesignerServerCreateMock).toHaveBeenNthCalledWith(2, {
				tdClient: sharedTdClient,
			});
		});

		it("should handle unexpected errors gracefully", async () => {
			serveStdioMock.mockImplementation(() => {
				throw new Error("Unexpected error");
			});

			await expect(
				startServer({
					argv: ["node", "cli.js", "--host=127.0.0.1", "--port=8080"],
					nodeEnv: "cli",
				}),
			).rejects.toThrow("Failed to initialize server: Unexpected error");
		});

		it("should handle non-Error exceptions", async () => {
			serveStdioMock.mockImplementation(() => {
				throw "String error";
			});

			await expect(
				startServer({
					argv: ["node", "cli.js", "--host=127.0.0.1", "--port=8080"],
					nodeEnv: "cli",
				}),
			).rejects.toThrow("Failed to initialize server: String error");
		});
	});
});
