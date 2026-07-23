# tdmcp-hub contract (v1)

Long-lived localhost hub for TouchDesigner MCP multi-instance. Cursor’s stdio MCP
process is a **thin consumer**: it calls `ensureHub()` then routes sticky targets
through the hub. TD bridge COMPs **register** and keep serving the existing OpenAPI
WebServer on an announced listen port (no reverse RPC in v1).

## Ports

| Port | Role |
|------|------|
| **9980** | `tdmcp-hub` HTTP (`127.0.0.1` only) |
| **9981** | Conventional lab WebServer listen (peer may register as id `lab`) |
| **9982** | Reserved — Stagepad |
| **9983** | Reserved — 4designer |
| **ephemeral / free** | TD peer OpenAPI listen port announced at register |

## Upsert (`ensureHub`)

Any Node consumer (Cursor MCP, CLI, tests) and the TD bridge (when `Hubdir` is set)
may **ensure** the hub:

1. `GET http://127.0.0.1:9980/health` — if `app=tdmcp-hub`, done.
2. Else acquire exclusive lockfile (`%TEMP%/tdmcp-hub.lock` / `/tmp/tdmcp-hub.lock`).
3. Spawn detached `node dist/hub.js` (or `Hubdir`/package root resolution).
4. Poll health until ready; release lock.

Concurrent ensurers: waiters poll health while one holder spawns.

## HTTP surface (`127.0.0.1:9980`)

| Method | Path | Body / notes |
|--------|------|----------------|
| `GET` | `/health` | `{ "app": "tdmcp-hub", "ok": true, "version": "…" }` |
| `GET` | `/peers` | `{ "peers": HubPeer[], "selectedId": string \| null }` |
| `POST` | `/peers/register` | Upsert peer (see payload) |
| `POST` | `/peers/heartbeat` | `{ "id": string }` — refresh TTL |
| `DELETE` | `/peers/:id` | Remove peer; if sticky, clear or fall back |
| `GET` | `/sticky` | `{ "selectedId": string \| null, "peer": HubPeer \| null }` |
| `PUT` | `/sticky` | `{ "id": string }` — select; 404 if unknown |

### Register payload

```json
{
  "id": "lab",
  "host": "http://127.0.0.1",
  "port": 9981,
  "label": "Lab",
  "source": "registered",
  "projectFolder": "C:/…",
  "projectName": "expe_baseline",
  "osPid": 12345,
  "toePath": "C:/…/x.toe",
  "projectDir": "C:/…"
}
```

- `id`, `host`, `port` required.
- `source`: `registered` (TD dial-in) \| `owned` (MCP lifecycle placeholder) \| `builtin` (soft lab hint).
- Heartbeat TTL default **45s**; peers without heartbeat are dropped.

## Sticky + MCP tools

- Hub owns durable sticky `selectedId` and peer list across Cursor MCP restarts.
- MCP tools resolve sticky peer from hub, then call TD OpenAPI at `host:port`.
- Builtin “always list lab @9981” is a soft hint only until a peer registers as `lab`.

## TD bridge

One user-facing COMP / onStart path:

1. Optional `EnsureHub` via `Hubdir` (node + package).
2. Bind WebServer (preferred port from `.tdmcp/state.json` or free port).
3. `POST /peers/register` + periodic heartbeat.
4. **Pause**: stop retry/heartbeat; clear status/preview feedback.
5. **Resume**: restart register loop.

## Non-goals (v1)

- Hub-pushed Python RPC into TD.
- Non-localhost binding.
- Replacing OpenAPI / ToeDigest.
