import { randomUUID } from "node:crypto";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allocateTdMcpPort } from "./portAllocator.js";
import type { TdTarget } from "./targetTypes.js";

export type TdMcpState = {
	targetId: string;
	port: number;
	host?: string;
	pid?: number;
	toe_launched?: string;
	exe?: string;
	started_at?: string;
};

export function templateRoot(): string {
	const here = dirname(fileURLToPath(import.meta.url));
	// src/core → ../../templates/mcp_project  (dev) or dist/core → ../../templates
	const candidates = [
		resolve(here, "../../templates/mcp_project"),
		resolve(here, "../../../templates/mcp_project"),
	];
	for (const c of candidates) {
		if (existsSync(c)) return c;
	}
	throw new Error(
		`MCP project template not found. Looked in: ${candidates.join(", ")}`,
	);
}

export function statePath(projectDir: string): string {
	return join(projectDir, ".tdmcp", "state.json");
}

export function readState(projectDir: string): TdMcpState | null {
	const p = statePath(projectDir);
	if (!existsSync(p)) return null;
	return JSON.parse(readFileSync(p, "utf8")) as TdMcpState;
}

export function writeState(projectDir: string, state: TdMcpState): void {
	const dir = join(projectDir, ".tdmcp");
	mkdirSync(dir, { recursive: true });
	writeFileSync(statePath(projectDir), `${JSON.stringify(state, null, 2)}\n`);
}

function dirNonEmpty(path: string): boolean {
	if (!existsSync(path)) return false;
	return readdirSync(path).length > 0;
}

export type CreateProjectResult = {
	destDir: string;
	toePath: string;
	targetId: string;
	port: number;
	target: TdTarget;
};

/**
 * Copy the MCP-ready template into destDir. Never starts TouchDesigner.
 */
export async function createTdProject(params: {
	destDir: string;
	name?: string;
	port?: number;
	host?: string;
}): Promise<CreateProjectResult> {
	const destDir = resolve(params.destDir);
	if (dirNonEmpty(destDir)) {
		throw new Error(
			`create_td_project: destination is not empty: ${destDir}`,
		);
	}
	const src = templateRoot();
	mkdirSync(destDir, { recursive: true });
	cpSync(src, destDir, { recursive: true });

	// Never leave bridge .tox sidecars beside the embedded COMP — TD pops
	// "unexpected node name duplication" for mcp_webserver_base (file rename
	// to tdmcp_bridge.tox is not enough; tox root op name still collides).
	for (const name of ["mcp_webserver_base.tox", "tdmcp_bridge.tox"] as const) {
		const tox = join(destDir, name);
		if (existsSync(tox)) {
			rmSync(tox, { force: true });
		}
	}
	const toeName = `${params.name?.trim() || "project"}.toe`;
	const seedToe = join(destDir, "project.toe");
	const toePath = join(destDir, toeName);
	if (toeName !== "project.toe" && existsSync(seedToe)) {
		cpSync(seedToe, toePath);
	}

	const port = params.port ?? (await allocateTdMcpPort());
	const targetId = `owned-${randomUUID().slice(0, 8)}`;
	const host = params.host || "http://127.0.0.1";
	writeState(destDir, {
		host,
		port,
		targetId,
		toe_launched: toePath,
	});

	const target: TdTarget = {
		host,
		id: targetId,
		label: `Owned ${toeName}`,
		port,
		projectDir: destDir,
		source: "owned",
		toePath,
	};
	return { destDir, port, target, targetId, toePath };
}

export function findTdExecutable(explicit?: string): string {
	if (explicit && existsSync(explicit)) return explicit;
	const env = process.env.TDINSTALL_TD_EXE || process.env.TOUCHDESIGNER_EXE;
	if (env && existsSync(env)) return env;

	const bases = [
		"C:\\Program Files\\Derivative",
		"C:\\Program Files (x86)\\Derivative",
	];
	const found: string[] = [];
	for (const base of bases) {
		if (!existsSync(base)) continue;
		for (const name of readdirSync(base)) {
			const exe = join(base, name, "bin", "TouchDesigner.exe");
			if (existsSync(exe)) found.push(exe);
		}
	}
	if (found.length === 0) {
		throw new Error(
			"TouchDesigner.exe not found. Pass tdExe or set TDINSTALL_TD_EXE.",
		);
	}
	found.sort();
	return found[found.length - 1];
}
