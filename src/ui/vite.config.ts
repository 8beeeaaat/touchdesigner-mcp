import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 5173,
		proxy: {
			"/mcp": {
				changeOrigin: true,
				secure: false,
				target: "http://127.0.0.1:6280",
			},
		},
	},
});
