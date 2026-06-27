import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Build the guest UI into a SINGLE self-contained index.html (JS + CSS inlined)
// so the MCP server can serve it verbatim as a ui:// rawHtml resource.
export default defineConfig({
	build: {
		// Keep output small/stable; the host loads this inside a sandboxed iframe.
		assetsInlineLimit: 100000000,
		cssCodeSplit: false,
		outDir: "dist",
		target: "es2022",
	},
	plugins: [react(), viteSingleFile()],
});
