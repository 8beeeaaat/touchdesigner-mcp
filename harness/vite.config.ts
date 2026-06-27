import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Proxy /mcp to the locally running MCP HTTP server (npm run http → :6280)
// so the harness talks same-origin and avoids CORS/DNS-rebinding issues.
export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		proxy: {
			"/mcp": {
				changeOrigin: true,
				target: "http://127.0.0.1:6280",
			},
		},
	},
});
