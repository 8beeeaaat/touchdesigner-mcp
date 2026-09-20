# TouchDesigner plugin for Codex and ChatGPT

## Install from the GitHub marketplace

**Prerequisite: the Codex CLI**, installed on the same computer as TouchDesigner. It is a separate terminal tool — it does not come with the ChatGPT desktop app. Follow [Codex CLI setup](https://developers.openai.com/codex/cli) first. Both commands below are typed into a terminal.

No repository clone, `npm install`, or plugin build is needed. Register this repository with Codex and install the ready-to-use package:

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
codex plugin add touchdesigner@touchdesigner-openai
```

Keep one registration, not two. If a `touchdesigner` plugin is already registered from a local build or a different source, remove it first with `codex plugin remove touchdesigner@touchdesigner-openai` and `codex plugin marketplace remove touchdesigner-openai`, then add the source above.

The repository ships `.agents/plugins/marketplace.json` and the complete generated package under `plugins/touchdesigner/`, including all eight skills and their references/scripts. In supported desktop clients, the marketplace also appears as a source in the Plugins Directory. See [OpenAI's Git marketplace instructions](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli).

Node.js 22.18+, 24.x, or 26+ must be installed. The client automatically starts `touchdesigner-mcp-server@^2` through `npx`; users do not run npm commands themselves. The first launch needs access to the npm registry. TouchDesigner must be running with `mcp_webserver_base.tox` imported, listening on `http://127.0.0.1:9981`.

Start a new session and ask “Use TouchDesigner setup to check my connection.” Also try “Give me a TouchDesigner project overview” and “Capture my TOP output.” The six command skills are launch, setup, debug, snapshot, overview, and perf; fundamentals and python-api provide shared conventions. Choose skills from the client's skill picker or request them by name; Claude slash-command syntax is not required.

## ChatGPT desktop app (Work / Codex)

The desktop app can use local plugins, but registering one goes through the Codex CLI described above — there is no way to add this marketplace from inside the app. Once `codex plugin marketplace add 8beeeaaat/touchdesigner-mcp` has run on the same computer:

1. Restart the ChatGPT desktop app.
2. In Work / Codex, open **Plugins Directory** and choose the **TouchDesigner** marketplace source (`touchdesigner-openai`).
3. Install the **TouchDesigner** plugin from that source, then start a new local conversation with the plugin enabled and ask "Check my TouchDesigner connection."

Whether local marketplaces appear at all depends on your client version and workspace policy. For conversations on the web or in the cloud, see [ChatGPT: connect the local server](#chatgpt-connect-the-local-server) below instead.

## Custom connection packages

The marketplace package uses the default TD endpoint. For a custom endpoint or registered ChatGPT connection, a maintainer can generate and distribute a separate local package. This advanced workflow requires a repository checkout and `npm ci`; ordinary marketplace installation above does not.

For another TD endpoint, build with explicit values, replace the Git marketplace registration with the generated local one, and start a new session:

```bash
npm run plugin:openai -- --host=http://127.0.0.1 --port=9982
codex plugin remove touchdesigner@touchdesigner-openai
codex plugin marketplace remove touchdesigner-openai
codex plugin marketplace add ./dist/openai-plugin
codex plugin add touchdesigner@touchdesigner-openai
```

Host and port configure the TD WebServer, not an MCP HTTP listener. These are resolved at build time; OpenAI does not expand Claude `user_config` placeholders. Avoid installing a second TouchDesigner MCP connection alongside the bundled one.

`--host` accepts an HTTP(S) scheme and hostname, including bracketed IPv6 such as `http://[::1]`. A trailing `/` is removed. Specify the port only with `--port`; host URLs containing a port, path, query, or fragment are rejected.

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

## Maintaining the distribution

Edit shared skills under `plugin/touchdesigner/skills`, the builder, or this guide, then run:

```bash
npm run plugin:sync
npm run plugin:check
```

Commit the generated `plugins/touchdesigner/` tree and `.agents/plugins/marketplace.json` alongside the source changes. Do not edit those generated files directly. CI regenerates in a temporary directory and compares every file, rejecting missing, stale, or extra files. Claude-only frontmatter and tool prefixes are removed during generation, and every skill receives verification instructions.

`npm run plugin:openai` remains available for custom packages under `dist/openai-plugin`. These temporary builds are not committed. The tracked distribution contains only the default local connection, never user-specific ChatGPT app IDs.
