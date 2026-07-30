import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * E2E fixture: run the BUILT server (dist/cli.js) as a real child process,
 * exactly as an MCP host would.
 *
 * Stability rules (no arbitrary sleeps): readiness is detected by polling
 * GET /health until it answers 200, and early process exit fails fast with
 * the captured stderr for diagnosis.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the built CLI entry (requires `npm run build:dist`). */
export const CLI_PATH = path.resolve(__dirname, "../../../dist/cli.js");

/** TouchDesigner connection args — E2E tests only exercise TD-independent surfaces. */
export const TD_ARGS = ["--host=http://127.0.0.1", "--port=9981"];

/**
 * Base port for E2E HTTP servers, offset per suite to avoid collisions with
 * the integration tests (3100-3302 range) and parallel vitest workers.
 */
const E2E_BASE_PORT = 36400;

export function uniquePort(offset: number): number {
	return E2E_BASE_PORT + offset;
}

export function assertBuilt(): void {
	if (!existsSync(CLI_PATH)) {
		throw new Error(
			`Built CLI not found at ${CLI_PATH}. Run \`npm run build:dist\` first (the test:e2e script does this automatically).`,
		);
	}
}

export interface HttpServerHandle {
	port: number;
	/** Base URL, e.g. http://127.0.0.1:36400 */
	url: string;
	/** MCP endpoint URL */
	mcpUrl: string;
	stop(): Promise<void>;
}

/**
 * Spawn `dist/cli.js` in HTTP mode and wait until /health answers 200.
 */
export async function startHttpServer(port: number): Promise<HttpServerHandle> {
	assertBuilt();

	const child: ChildProcess = spawn(
		process.execPath,
		[
			CLI_PATH,
			`--mcp-http-port=${port}`,
			"--mcp-http-host=127.0.0.1",
			...TD_ARGS,
		],
		{ stdio: ["ignore", "ignore", "pipe"] },
	);

	let stderr = "";
	child.stderr?.on("data", (chunk) => {
		stderr += String(chunk);
	});

	const url = `http://127.0.0.1:${port}`;
	const deadline = Date.now() + 15_000;

	// Condition-based readiness wait: poll /health, never a fixed sleep.
	for (;;) {
		if (child.exitCode !== null) {
			throw new Error(
				`E2E server exited early with code ${child.exitCode}:\n${stderr}`,
			);
		}
		try {
			const res = await fetch(`${url}/health`);
			if (res.ok) break;
		} catch {
			// Server not accepting connections yet
		}
		if (Date.now() > deadline) {
			child.kill("SIGKILL");
			throw new Error(`E2E server not healthy within 15s:\n${stderr}`);
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return {
		mcpUrl: `${url}/mcp`,
		port,
		async stop() {
			if (child.exitCode !== null) return;
			const exited = once(child, "exit");
			child.kill("SIGTERM");
			const timeout = new Promise<"timeout">((resolve) =>
				setTimeout(() => resolve("timeout"), 3_000),
			);
			if ((await Promise.race([exited, timeout])) === "timeout") {
				child.kill("SIGKILL");
				await exited;
			}
		},
		url,
	};
}
