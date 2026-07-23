/**
 * Stdio MCP lifecycle guards for Cursor/Windows.
 *
 * Cursor frequently fails to kill child MCP processes on Restart / Reload Window.
 * The TypeScript MCP SDK StdioServerTransport also does not exit when stdin closes
 * (github.com/modelcontextprotocol/typescript-sdk/issues/2002). Result: zombie
 * `node dist/cli.js --stdio` processes and a Cursor session that times out on tools
 * while an old process still appears alive.
 *
 * These guards make *our* server exit when the IDE drops the pipe or our parent dies.
 */

const EXIT_CODE_DISCONNECT = 0;

function forceExit(reason: string): void {
	try {
		console.error(`[tdmcp-stdio] exiting: ${reason}`);
	} catch {
		// ignore
	}
	// Hard exit — graceful close can hang if transport is already broken
	process.exit(EXIT_CODE_DISCONNECT);
}

/**
 * Install once for stdio mode. Safe to call before `server.connect(transport)`.
 */
export function installStdioLifecycleGuards(options?: {
	/** Poll interval for parent-pid watchdog (Windows). Default 2000ms. */
	parentPollMs?: number;
}): void {
	const parentPollMs = options?.parentPollMs ?? 2_000;
	const initialPpId = process.ppid;

	const onStdinGone = (evt: string) => () => {
		forceExit(`stdin ${evt}`);
	};

	try {
		process.stdin.on("end", onStdinGone("end"));
		process.stdin.on("close", onStdinGone("close"));
		process.stdin.on("error", (err) => {
			forceExit(`stdin error: ${err instanceof Error ? err.message : String(err)}`);
		});
	} catch (err) {
		console.error(
			"[tdmcp-stdio] failed to attach stdin listeners",
			err instanceof Error ? err.message : err,
		);
	}

	// When Cursor dies without closing pipes cleanly (common on Windows), ppid changes
	// or the parent process disappears.
	if (process.platform === "win32" || process.env.TDMCP_PARENT_WATCH === "1") {
		const timer = setInterval(() => {
			try {
				const ppid = process.ppid;
				if (!ppid || ppid === 1 || ppid === 0) {
					forceExit(`parent gone (ppid=${ppid})`);
				}
				if (ppid !== initialPpId) {
					// Parent replaced — usually means we were re-parented to an orphan supervisor
					forceExit(`parent changed ${initialPpId} → ${ppid}`);
				}
				// Windows: process.kill(ppid, 0) throws if parent does not exist
				process.kill(ppid, 0);
			} catch {
				forceExit("parent process not alive");
			}
		}, parentPollMs);
		timer.unref();
	}

	process.on("disconnect", () => forceExit("process disconnect"));
}
