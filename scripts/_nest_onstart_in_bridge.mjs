#!/usr/bin/env node
/**
 * Nest project1/tdmcp_port_onstart* under project1/tdmcp_bridge/ in template toe.
 */
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { expandToeInPlace, collapseToeInPlace } from "../dist/toe/collapseToe.js";
import { templateRoot } from "../dist/core/lifecycle.js";

const tmpl = templateRoot();
const toe = join(tmpl, "project.toe");
const work = join(tmpl, "_nest_onstart.toe");
cpSync(toe, work);
for (const p of [`${work}.dir`, `${work}.toc`]) {
	if (existsSync(p)) rmSync(p, { force: true, recursive: true });
}
const ex = await expandToeInPlace({ toePath: work });
const p1 = join(ex.expandDir, "project1");
const bridgeDir = join(p1, "tdmcp_bridge");
mkdirSync(bridgeDir, { recursive: true });
const moved = [];
for (const name of readdirSync(p1)) {
	if (!name.startsWith("tdmcp_port_onstart")) continue;
	const from = join(p1, name);
	const to = join(bridgeDir, name);
	if (existsSync(to)) rmSync(to, { force: true, recursive: true });
	renameSync(from, to);
	moved.push(name);
}

const toc = `${work}.toc`;
if (existsSync(toc)) {
	let text = readFileSync(toc, "utf8");
	const nl = text.includes("\r\n") ? "\r\n" : "\n";
	const lines = text.split(/\r?\n/).map((l) => {
		const t = l.trim();
		if (t.startsWith("project1/tdmcp_port_onstart")) {
			return t.replace(
				/^project1\/tdmcp_port_onstart/,
				"project1/tdmcp_bridge/tdmcp_port_onstart",
			);
		}
		return l;
	});
	text = lines.join(nl);
	for (const ext of [".n", ".parm", ".text"]) {
		const line = `project1/tdmcp_bridge/tdmcp_port_onstart${ext}`;
		if (!text.includes(line)) {
			text = `${text.trimEnd()}${nl}${line}${nl}`;
		}
	}
	// Drop any remaining sibling onstart toc lines
	text = text
		.split(/\r?\n/)
		.filter((l) => {
			const t = l.trim();
			return !(
				t === "project1/tdmcp_port_onstart" ||
				/^project1\/tdmcp_port_onstart\./.test(t)
			);
		})
		.join(nl);
	if (!text.endsWith("\n")) text += nl;
	writeFileSync(toc, text, "utf8");
}

console.log("MOVED", moved);
console.log(
	"bridge onstart files",
	readdirSync(bridgeDir).filter((n) => n.includes("onstart")),
);

rmSync(work, { force: true });
await collapseToeInPlace({ expandDir: ex.expandDir, outToePath: work });
cpSync(work, toe);
rmSync(work, { force: true });
try {
	rmSync(`${work}.toc`, { force: true });
} catch {
	/* ignore */
}
try {
	rmSync(`${work}.dir`, { force: true, recursive: true });
} catch {
	/* ignore */
}
console.log("template toe updated", toe);
