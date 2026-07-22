import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const child = spawn("node", ["dist/cli.js", "--stdio"], {
	cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
	stdio: ["pipe", "pipe", "pipe"],
});

// Fix Windows path from fileURL
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
child.kill();

const proc = spawn("node", [join(root, "dist/cli.js"), "--stdio"], {
	cwd: root,
	stdio: ["pipe", "pipe", "pipe"],
});

const rl = createInterface({ input: proc.stdout });
let nextId = 1;
const pending = new Map();

function send(method, params, isNotification = false) {
	const id = isNotification ? undefined : nextId++;
	const msg = isNotification
		? { jsonrpc: "2.0", method, params }
		: { jsonrpc: "2.0", id, method, params };
	proc.stdin.write(`${JSON.stringify(msg)}\n`);
	if (id !== undefined) {
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
		});
	}
}

rl.on("line", (line) => {
	if (!line.trim()) return;
	let msg;
	try {
		msg = JSON.parse(line);
	} catch {
		return;
	}
	if (msg.id != null && pending.has(msg.id)) {
		const { resolve, reject } = pending.get(msg.id);
		pending.delete(msg.id);
		if (msg.error) reject(msg.error);
		else resolve(msg.result);
	}
});

proc.stderr.on("data", () => {});

const timer = setTimeout(() => {
	console.error("timeout");
	proc.kill();
	process.exit(1);
}, 20000);

try {
	await send("initialize", {
		protocolVersion: "2024-11-05",
		capabilities: {},
		clientInfo: { name: "probe", version: "0" },
	});
	await send("notifications/initialized", {}, true);
	const result = await send("tools/list", {});
	const names = (result?.tools || []).map((t) => t.name).sort();
	console.log("count", names.length);
	console.log("get_toe_digest", names.includes("get_toe_digest"));
	console.log(names.join("\n"));
	clearTimeout(timer);
	proc.kill();
	process.exit(names.includes("get_toe_digest") ? 0 : 2);
} catch (e) {
	console.error(e);
	clearTimeout(timer);
	proc.kill();
	process.exit(1);
}
