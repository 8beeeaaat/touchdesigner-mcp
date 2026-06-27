---
name: verify-mcp-server
description: >-
  touchdesigner-mcp のローカルビルドを実際に MCP サーバーとして登録し、
  MCP プロトコル応答(initialize / tools/list)と TouchDesigner への疎通
  (get_td_info)、統合テストまでを検証するワークフロー。
  「MCP サーバーとして動作確認」「更新版を実機検証」「ローカルビルドを登録して検証」
  「リリース前の動作検証」などの依頼時、および依存更新やコード変更後の
  実機確認が必要な場面で使用する。
---

# MCP サーバー動作検証フロー

ローカルビルド(`dist/cli.js`)を MCP サーバーとして登録し、プロトコル層 → TouchDesigner 疎通 → 統合テストの順に検証する。

## Step 1: 前提確認

```bash
npm run build:dist          # dist を最新ソースで再ビルド(バージョンバンプ後は特に必須)
nc -z 127.0.0.1 9981        # TouchDesigner WebServer の起動確認
```

- TD WebServer が DOWN の場合、プロトコル検証(Step 3 の initialize / tools/list)までは可能だが、
  `get_td_info` と統合テストは `ECONNREFUSED` で失敗する。ユーザーに TouchDesigner の起動
  (`mcp_webserver_base.tox` 配置済みプロジェクト)を依頼する

## Step 2: MCP サーバー登録(docs/development.md 準拠)

```bash
claude mcp add -s user touchdesigner-stdio -- npx -y <リポジトリ絶対パス>/dist/cli.js --stdio --port=9981
claude mcp get touchdesigner-stdio   # Status: ✔ Connected を確認
```

- 既存の `touchdesigner`(user スコープ、`npx -y touchdesigner-mcp-server@latest` = npm 公開版)は
  **触らない**。ローカル検証用は別名 `touchdesigner-stdio` で共存させる
- セッション途中で登録したサーバーのツールは**現在のセッションには現れない**(次回セッションから)。
  そのため動作検証は Step 3 のスクリプトで直接行う

## Step 3: プロトコル検証

同梱スクリプトで JSON-RPC を直接話して検証する:

```bash
node scripts/verify_mcp.mjs <リポジトリ絶対パス>/dist/cli.js 9981
```

検証内容と期待値:

| チェック | 期待値 |
| --- | --- |
| `initialize` → serverInfo | `version` が package.json のバージョンと一致 |
| `tools/list` | 13ツール(describe_td_tools, get_td_info, execute_python_script, create_td_node, ...) |
| `tools/call get_td_info` | `MCP Server Version`(Node 側)と `API Server Version`(TD 内 Python 側)が両方表示され、互換チェックを通過 |

- `MCP Server Version` と `API Server Version` は**一致しなくて正常**。API バージョンはサーバー/API
  変更時のみ上がる(`mcpCompatibility.minApiVersion` を満たせば互換)
- この1往復で axios(HTTP)、zod(レスポンス検証)、MCP SDK(プロトコル)の主要依存をすべて通過する

## Step 4: 統合テスト

TD WebServer が UP なら統合テストをフルで実行する:

```bash
npm run test:integration   # 29テスト。TD 未起動だと ECONNREFUSED で失敗(環境要因)
```

## Step 5: 後片付け

検証が終わったら登録を削除するかユーザーに確認する(残せば dist 再ビルドのたびに最新ローカル版が使われる):

```bash
claude mcp remove "touchdesigner-stdio" -s user
claude mcp list   # 既存の touchdesigner(@latest)だけが残っていることを確認
```
