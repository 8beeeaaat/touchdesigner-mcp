import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	patchExternalToxParm,
	readBuildVersion,
	readTdTextDatPayload,
	syncBuildFromKit,
	writeTdTextDat,
} from "../../src/toe/graftManifest.js";

describe("syncBuildFromKit", () => {
	it("overwrites working expand .build with kit .build", () => {
		const root = mkdtempSync(join(tmpdir(), "tdmcp-build-sync-"));
		const expandDir = join(root, "work");
		const kitExpandDir = join(root, "kit");
		mkdirSync(expandDir);
		mkdirSync(kitExpandDir);
		writeFileSync(
			join(expandDir, ".build"),
			"version 099\nbuild 2022.29850\ntime old\n",
		);
		writeFileSync(
			join(kitExpandDir, ".build"),
			"version 099\nbuild 2025.33070\ntime new\n",
		);

		const result = syncBuildFromKit(expandDir, kitExpandDir);

		expect(result.sourceBuild).toBe("2022.29850");
		expect(result.graftBuild).toBe("2025.33070");
		expect(readBuildVersion(expandDir)).toBe("2025.33070");
		expect(readFileSync(join(expandDir, ".build"), "utf8")).toContain(
			"build 2025.33070",
		);
	});

	it("throws when kit .build is missing", () => {
		const root = mkdtempSync(join(tmpdir(), "tdmcp-build-sync-missing-"));
		const expandDir = join(root, "work");
		const kitExpandDir = join(root, "kit");
		mkdirSync(expandDir);
		mkdirSync(kitExpandDir);
		writeFileSync(join(expandDir, ".build"), "build 2022.1\n");

		expect(() => syncBuildFromKit(expandDir, kitExpandDir)).toThrow(
			/graft kit missing \.build/,
		);
	});
});

describe("writeTdTextDat / patchExternalToxParm", () => {
	it("round-trips Text DAT payload with BE length header", () => {
		const root = mkdtempSync(join(tmpdir(), "tdmcp-textdat-"));
		const path = join(root, "sample.text");
		const body = "import os\n\ndef setup():\n\tpass\n";
		writeTdTextDat(path, body);
		const raw = readFileSync(path);
		expect(raw[0]).toBe(0x32);
		const claimed = (raw[25] << 8) | raw[26];
		expect(claimed).toBe(Buffer.byteLength(body, "utf8"));
		expect(readTdTextDatPayload(path)).toBe(body);
	});

	it("clears externaltox on the bridge parm", () => {
		const root = mkdtempSync(join(tmpdir(), "tdmcp-exttox-"));
		const project1 = join(root, "project1");
		mkdirSync(project1);
		writeFileSync(
			join(project1, "tdmcp_bridge.parm"),
			'?\npageindex 0 3\nenableexternaltox 0 off\nexternaltox 17 "" "project.folder + \'/tdmcp_bridge.tox\'"\nPort 67108928 9984\n?\n',
		);
		patchExternalToxParm(root);
		const body = readFileSync(join(project1, "tdmcp_bridge.parm"), "utf8");
		expect(body).toMatch(/^enableexternaltox 0 off$/m);
		expect(body).toMatch(/^externaltox 17 "" ""$/m);
		expect(body).not.toContain("tdmcp_bridge.tox");
	});
});
