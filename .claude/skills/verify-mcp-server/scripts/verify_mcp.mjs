#!/usr/bin/env node
// Verify a touchdesigner-mcp stdio build speaks MCP and reaches TouchDesigner.
// Usage: node verify_mcp.mjs <path-to-cli.js> [td-port]
// Exit 0 on success. Prints serverInfo, tool list, and get_td_info output.
import { spawn } from "node:child_process";

const [cliPath, tdPort = "9981"] = process.argv.slice(2);
if (!cliPath) {
	console.error("Usage: node verify_mcp.mjs <path-to-cli.js> [td-port]");
	process.exit(2);
}

const server = spawn("node", [cliPath, "--stdio", `--port=${tdPort}`]);

const pending = new Map();
let buffer = "";
server.stdout.on("data", (chunk) => {
	buffer += chunk.toString();
	let idx = buffer.indexOf("\n");
	while (idx >= 0) {
		const line = buffer.slice(0, idx).trim();
		buffer = buffer.slice(idx + 1);
		if (line) {
			const msg = JSON.parse(line);
			if (msg.id !== undefined && pending.has(msg.id)) {
				pending.get(msg.id)(msg);
				pending.delete(msg.id);
			}
		}
		idx = buffer.indexOf("\n");
	}
});
server.stderr.on("data", () => {});

const request = (id, method, params) =>
	new Promise((resolve, reject) => {
		pending.set(id, resolve);
		setTimeout(() => reject(new Error(`timeout: ${method}`)), 15000);
		server.stdin.write(
			`${JSON.stringify({ id, jsonrpc: "2.0", method, params })}\n`,
		);
	});

try {
	const init = await request(1, "initialize", {
		capabilities: {},
		clientInfo: { name: "verify-script", version: "0.0.0" },
		protocolVersion: "2024-11-05",
	});
	console.log("serverInfo:", JSON.stringify(init.result.serverInfo));
	server.stdin.write(
		`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
	);

	const tools = await request(2, "tools/list", {});
	console.log(`tools: ${tools.result.tools.length}`);
	console.log(tools.result.tools.map((t) => t.name).join(", "));

	const info = await request(3, "tools/call", {
		arguments: {},
		name: "get_td_info",
	});
	if (info.error || info.result.isError) {
		throw new Error(
			`get_td_info failed: ${JSON.stringify(info.error ?? info.result)}`,
		);
	}
	const text = info.result.content?.[0]?.text ?? JSON.stringify(info.result);
	console.log("get_td_info:", text.slice(0, 400));
	console.log("VERIFY: OK");
	server.kill();
	process.exit(0);
} catch (err) {
	console.error("VERIFY: FAILED -", err.message);
	server.kill();
	process.exit(1);
}
