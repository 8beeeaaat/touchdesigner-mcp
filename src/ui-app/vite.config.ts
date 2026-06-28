import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build a guest UI into a SINGLE self-contained HTML (JS + CSS inlined) so the
// MCP server can serve it verbatim as a ui:// rawHtml resource.
//
// viteSingleFile sets output.inlineDynamicImports, which forbids multiple
// inputs in one build. We therefore build ONE entry per invocation, selected by
// the UI_ENTRY env var (see build:ui-app in package.json). Defaults to the node
// browser so `vite dev` / a bare build still work.
const ENTRIES = ["paramEditor", "errorDashboard"] as const;
const ENTRY = ENTRIES.includes(process.env.UI_ENTRY as (typeof ENTRIES)[number])
	? (process.env.UI_ENTRY as string)
	: "index";

export default defineConfig({
	build: {
		// Keep output small/stable; the host loads this inside a sandboxed iframe.
		assetsInlineLimit: 100000000,
		cssCodeSplit: false,
		// Each entry writes its own dir so the two builds don't clobber each other.
		emptyOutDir: false,
		outDir: `dist/${ENTRY}`,
		rollupOptions: {
			input: resolve(__dirname, `${ENTRY}.html`),
		},
		target: "es2022",
	},
	plugins: [react(), viteSingleFile()],
});
