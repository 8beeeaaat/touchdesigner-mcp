# TouchDesigner plugin for Codex and ChatGPT

The OpenAI package includes all eight skills from `plugin/touchdesigner/skills`, including their reference files and scripts. It uses the supported `.codex-plugin/plugin.json` format. Build it from this repository with Node.js and the installed npm dependencies:

```bash
npm install
npm run plugin:openai
```

Output: `dist/openai-plugin/plugins/touchdesigner`. Edit the shared source skills or `scripts/buildOpenaiPlugin.mjs`, then rebuild; generated files are not committed. The build removes Claude-only frontmatter and tool prefixes and adds explicit verification instructions to every skill. Claude's original package and hooks remain available separately.

## Codex: local MCP server

The default package starts `touchdesigner-mcp-server@^2` through `npx`, targeting `http://127.0.0.1:9981`. TouchDesigner must be running with `mcp_webserver_base.tox` imported. The generated marketplace is a local testing/distribution source:

```bash
codex plugin marketplace add ./dist/openai-plugin
codex plugin add touchdesigner@touchdesigner-openai
```

Start a new session and ask “Use TouchDesigner setup to check my connection.” Also try “Give me a TouchDesigner project overview” and “Capture my TOP output.” The six command skills are launch, setup, debug, snapshot, overview, and perf; fundamentals and python-api provide shared conventions. Choose skills from the client's skill picker or request them by name; Claude slash-command syntax is not required.

For another TD endpoint, rebuild with explicit values, reinstall the plugin, and start a new session:

```bash
npm run plugin:openai -- --host=http://127.0.0.1 --port=9982
codex plugin remove touchdesigner@touchdesigner-openai
codex plugin add touchdesigner@touchdesigner-openai
```

Host and port configure the TD WebServer, not an MCP HTTP listener. These are resolved at build time; OpenAI does not expand Claude `user_config` placeholders. Avoid installing a second TouchDesigner MCP connection alongside the bundled one.

## ChatGPT: connect the local server

ChatGPT needs a reachable MCP connection. A local package does not make a cloud conversation able to execute `npx` on your machine. Use [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) for private access:

1. Create a tunnel in Platform tunnel settings, associate the target ChatGPT workspace, and install `tunnel-client` using the official guide. Configure its runtime credential outside this repository.
2. On the TouchDesigner machine, start the MCP HTTP server:

   ```bash
   npx -y --package=touchdesigner-mcp-server@^2 touchdesigner-mcp-server --mcp-http-host=127.0.0.1 --mcp-http-port=6280 --host=http://127.0.0.1 --port=9981
   ```

3. Configure the tunnel client to forward to `http://127.0.0.1:6280/mcp` and keep it running. Port 9981 serves the TD API; use port 6280 for MCP.
4. In ChatGPT developer mode, create a plugin connection using Tunnel and your tunnel ID, then verify `get_td_info`. Account/workspace permissions determine availability. See [Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt).
5. Copy the connection's technical ID (`plugin_asdk_app...`) from its URL. Build a package that maps the skills to that connection:

   ```bash
   npm run plugin:openai -- --out=dist/openai-chatgpt --app-id=plugin_asdk_app_YOUR_ID
   ```

This variant contains `.app.json` instead of a local `.mcp.json`. Install its marketplace root (`dist/openai-chatgpt`) in place of the local variant, and select it in the desktop Plugins Directory in Work/Codex. Both variants use the same plugin and marketplace identities; install one at a time. Local marketplace availability varies by surface. Ordinary web Chat can use the registered MCP tools, but does not automatically load skills from your filesystem. The [official packaging guide](https://developers.openai.com/plugins/build/plugins) describes the local plugin workflow and public distribution separately.

The launch skill requires shell access on the TD machine. In an MCP-only chat it guides the user through opening TD locally. Verification is expressed in the skills; the OpenAI package does not require Claude hooks. Private tunnel testing is not public directory publication.

## Verification

After installation, check setup, overview, and a snapshot of an existing TOP. For a requested mutation, confirm the assistant reads back parameters and checks node errors and the rendered output. A successful build validates packaging, not account-specific installation or a live TD connection.
