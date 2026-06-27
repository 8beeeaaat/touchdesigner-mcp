# Scopes, the `claude mcp` CLI, and Secrets

## Scopes

Claude Code resolves MCP servers from three scopes. Scope decides visibility and
whether the declaration is committed to git.

| Scope   | Stored in                       | Who sees it                    | Committed | Use for |
|---------|---------------------------------|--------------------------------|-----------|---------|
| project | `.mcp.json` at repo root        | everyone who checks out the repo | yes     | team-shared servers |
| user    | user config (`~/.claude.json`)  | all of this user's projects    | no        | personal tools across projects |
| local   | project-scoped user settings    | only this user, in this project | no       | experiments, machine-specific secrets |

**Precedence**: local overrides project overrides user when names collide. Prefer
distinct names to avoid surprises.

**Default choice**: project scope for anything the team relies on (it travels with the
repo); user scope for personal utilities; local scope for throwaway or secret-bearing
configs that must not be committed.

## The `claude mcp` CLI

Adding via CLI is often safer than hand-editing because it writes valid JSON and
targets the right scope.

```bash
# stdio server, project scope (writes .mcp.json)
claude mcp add <name> --scope project -- npx -y @scope/server-pkg

# http server, user scope
claude mcp add <name> --scope user --transport http https://example.com/mcp

# inspect / manage
claude mcp list                 # list configured servers
claude mcp get <name>           # show one server's resolved config
claude mcp remove <name>        # remove a server

# authentication (OAuth-style servers)
claude mcp login <name>         # authenticate a server from the CLI
claude mcp logout <name>        # clear that server's stored auth
#   --no-browser : complete the flow over SSH via stdin redirect
```

Notes:
- Everything after `--` in `add` is the literal command + args for stdio servers.
- `--transport http` (or `sse`) switches to a URL-based remote server.
- When a server uses OAuth, `claude mcp login` is the supported way to (re)authenticate;
  resetting a broken auth state is usually `logout` then `login`.

Hand-editing `.mcp.json` is fine too — it is what the `mcp-setup` skill does when the
user wants explicit, reviewable changes in the repo. The PreToolUse hook validates such
edits.

## Secrets

- Always reference secrets as `${ENV_VAR}` in `env` (stdio) or `headers` (http/sse).
- Set the actual value in the shell / OS keychain / `.env` that is gitignored — never in
  `.mcp.json` itself, since project-scope config is committed.
- For OAuth servers, no token goes in config at all; `claude mcp login` stores it
  outside the repo.
- When reviewing an existing config, flag any header/env value that looks like a real
  token (long opaque string, not `${...}`) as a secret-leak risk.
