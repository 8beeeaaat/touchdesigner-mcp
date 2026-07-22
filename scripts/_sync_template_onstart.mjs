import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expandToeInPlace, collapseToeInPlace } from "../dist/toe/collapseToe.js";
import { patchOnstartText } from "../dist/toe/graftManifest.js";
import { templateRoot } from "../dist/core/lifecycle.js";

const tmpl = templateRoot();
const toe = join(tmpl, "project.toe");
const work = join(tmpl, "_onstart_sync.toe");
cpSync(toe, work);
for (const p of [`${work}.dir`, `${work}.toc`]) {
	if (existsSync(p)) rmSync(p, { force: true, recursive: true });
}
const ex = await expandToeInPlace({ toePath: work });
patchOnstartText(ex.expandDir);
rmSync(work, { force: true });
await collapseToeInPlace({ expandDir: ex.expandDir, outToePath: work });
cpSync(work, toe);
rmSync(work, { force: true });
try {
	rmSync(`${work}.toc`, { force: true });
} catch {
	/* ignore */
}
console.log("patched template onstart from tdmcp_port_onstart.py");
