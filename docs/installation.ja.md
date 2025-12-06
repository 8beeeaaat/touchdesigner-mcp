# TouchDesigner MCP Server インストールガイド

TouchDesigner MCP を各種 AI エージェントおよびプラットフォームで利用するためのインストール手順をまとめたドキュメントです。

## クイックスタート

もっともシンプルなのは Claude Desktop + MCP バンドルの組み合わせです。[最新リリース](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest)から
`touchdesigner-mcp-td.zip` と `touchdesigner-mcp.mcpb` をダウンロードし、TouchDesigner プロジェクトに
`mcp_webserver_base.tox` をインポート（推奨: `project1/mcp_webserver_base`）、その後 `.mcpb` ファイルを
ダブルクリックして Claude Desktop に追加すれば、コンポーネント起動後に自動で接続されます。

## 目次

- [前提条件](#前提条件)
- [TouchDesigner セットアップ（全方法共通）](#touchdesigner-セットアップ全方法共通)
- [インストール方法](#mcpサーバーのインストール方法)
  - [方法1: MCP Bundle（Claude Desktop 推奨）](#方法1-mcp-bundleclaude-desktop-推奨)
  - [方法2: NPM パッケージ（Claude Code / Codex / その他 MCP クライアント）](#方法2-npm-パッケージclaude-code--codex--その他-mcp-クライアント)
  - [方法3: Docker コンテナ](#方法3-docker-コンテナ)
- [HTTP トランスポートモード](#http-トランスポートモード)
- [動作確認](#動作確認)
- [トラブルシューティング](#トラブルシューティング)

## 前提条件

- **TouchDesigner**（最新版推奨）
- NPM 利用の場合: **Node.js 18.x** 以上。 _Claude Desktopをご利用の場合は不要です_
- Docker 利用の場合: **Docker** と **Docker Compose**

## TouchDesigner セットアップ（全方法共通）

どの方法でも以下の手順が必須です。

1. [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip) をダウンロード
2. ZIP を展開
3. `mcp_webserver_base.tox` を TouchDesigner プロジェクトにインポート
4. `/project1/mcp_webserver_base` など任意の場所に配置

<https://github.com/user-attachments/assets/215fb343-6ed8-421c-b948-2f45fb819ff4>

**⚠️ 最重要:** フォルダ構成を変更したりファイルを移動しないでください。`mcp_webserver_base.tox` は `modules/` 以下を相対パスで参照しています。

**構成例:**

```text
touchdesigner-mcp-td/
├── import_modules.py          # モジュールローダー
├── mcp_webserver_base.tox     # メインコンポーネント
└── modules/                   # Python モジュール群
    ├── mcp/                   # MCP ロジック
    ├── utils/                 # ユーティリティ
    └── td_server/             # API サーバーコード
```

Alt+T または Dialogs → Textport でログを確認可能です。

![Textport](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

## MCPサーバーのインストール方法

以下のインストール方法はいずれも、前段で [TouchDesigner セットアップ](#touchdesigner-セットアップ全方法共通) を完了していることを前提としています。利用する AI エージェントや好みに合わせて選択してください。

### 方法1: MCP Bundle（Claude Desktop 限定）

**対象:** Claude Desktop

#### ダウンロード

[最新リリース](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest)から以下を入手します。

- **TouchDesigner Components**: [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip)
- **MCP Bundle**: [touchdesigner-mcp.mcpb](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp.mcpb)

#### セットアップ手順

1. **TouchDesigner を準備**
   - プロジェクトごとに一度だけ [TouchDesigner セットアップ](#touchdesigner-セットアップ全方法共通) を実施します（`mcp_webserver_base.tox` の配置やフォルダ構成の維持、Textport での確認など）。

2. **MCP Bundle をインストール**
   - `touchdesigner-mcp.mcpb` をダブルクリックして Claude Desktop に追加

   <https://github.com/user-attachments/assets/0786d244-8b82-4387-bbe4-9da048212854>

3. **利用開始**
   - バンドルが TouchDesigner への接続を自動で処理します
   - MCP サーバーが表示されない場合は Claude Desktop を再起動
   - MCP パネルで `touchdesigner-mcp` が利用可能になっているか確認

### 方法2: NPM パッケージ（Claude Code / Codex / その他 MCP クライアント向け）

#### 事前準備

- Node.js 18.x 以上
- TouchDesigner コンポーネント設置済み（[TouchDesigner セットアップ](#touchdesigner-セットアップ全方法共通)）

準備ができたら、利用するクライアントに以下のいずれかの設定を登録します。

#### Claude Desktop の例

`claude_desktop_config.json` を編集します。

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "npx",
      "args": ["-y", "touchdesigner-mcp-server@latest", "--stdio"]
    }
  }
}
```

_任意:_ TouchDesigner を別ホスト/ポートで動かす場合は `--host` / `--port` を追記してください（例: `http://127.0.0.1:9981`）。

#### Claude Code の例

コマンドで追加:

```bash
claude mcp add -s user touchdesigner -- npx -y touchdesigner-mcp-server@latest --stdio
```

または `~/.claude.json` を直接編集:

```json
{
  "mcpServers": {
    "touchdesigner": {
      "command": "npx",
      "args": ["-y", "touchdesigner-mcp-server@latest", "--stdio"]
    }
  }
}
```

#### Codex の例

```bash
codex mcp add touchdesigner -- npx -y touchdesigner-mcp-server@latest --stdio
```

または `~/.codex/config.toml` を直接編集:

```toml
[mcp_servers.touchdesigner]
command = "npx"
args = ["-y", "touchdesigner-mcp-server@latest", "--stdio"]
```

#### その他の MCP クライアント

- **command**: `npx`
- **args**: `["-y", "touchdesigner-mcp-server@latest", "--stdio"]`
- **オプション**: `--host=<url>`、`--port=<number>`

ホスト/ポートのオプションは TouchDesigner の接続先を変更する場合のみ追加します。

### 方法3: Docker コンテナ

**対象:** 開発者、CI/CD、またはコンテナ化された環境で利用したい場合。

#### 必要環境

- Docker / Docker Compose
- TouchDesigner コンポーネント設置済み

#### 導入手順

1. **リポジトリをクローン**

   ```bash
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   ```

2. **Docker イメージをビルド**

   ```bash
   make build
   ```

3. **コンテナを起動**

##### オプションA: [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http)

1. `TRANSPORT=http` でコンテナを起動します。

   ```bash
   TRANSPORT=http docker-compose up -d
   ```

2. （必要に応じて）HTTP ポートや TouchDesigner ホストを変更します。

   ```bash
   TRANSPORT=http \
   MCP_HTTP_PORT=6280 \
   TD_HOST=http://host.docker.internal \
   docker compose up -d
   ```

3. MCP クライアントに HTTP エンドポイントを設定します

- 例: Claude Code

   ```json
   {
     "mcpServers": {
       "touchdesigner-http": {
         "type": "http",
         "url": "http://localhost:6280/mcp"
       }
     }
   }
   ```

- 例: Claude Desktop

   ```json
   {
     "mcpServers": {
       "touchdesigner-http": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "http://localhost:6280/mcp"
         ]
       }
     }
   }
   ```

4. コンテナのヘルスチェックを実行して接続確認します（コンテナは `0.0.0.0` で待ち受けますが、`docker-compose.yml` で `127.0.0.1` に公開するためデフォルトではローカルのみ到達可能です）。

   ```bash
   curl http://localhost:6280/health
   ```

##### オプションB: Stdio パススルー

1. コンテナを stdio モードで起動します。

   ```bash
   docker-compose up -d
   ```

2. クライアントからコンテナへ exec する設定を追加します（Claude Desktop 例）。

```json
    {
      "mcpServers": {
        "touchdesigner-docker": {
          "command": "docker",
          "args": [
            "compose",
            "-f",
            "/path/to/your/touchdesigner-mcp/docker-compose.yml",
            "exec",
            "-i",
            "touchdesigner-mcp-server",
            "node",
            "dist/cli.js",
            "--stdio",
            "--host=http://host.docker.internal"
          ]
        }
      }
    }
```

※Windows の場合は `C:\path\to\...` のようにドライブレターを含めてください。

## HTTP トランスポートモード

TouchDesigner MCP Server は stdio だけでなく HTTP/SSE でも動作します。リモートエージェントやブラウザ統合など、必要な場合のみ本節を参照してください（Node.js CLI または Docker から起動可能）。

### 設定オプション

| オプション | 説明 | デフォルト |
| --- | --- | --- |
| `--mcp-http-port` | HTTP サーバーポート（HTTP モード必須） | - |
| `--mcp-http-host` | バインドアドレス（Docker エントリポイントでは `0.0.0.0`、CLI では `127.0.0.1`） | `127.0.0.1` (CLI) |
| `--host` | TouchDesigner WebServer ホスト | `http://127.0.0.1` |
| `--port` | TouchDesigner WebServer ポート | `9981` |

> セキュリティメモ（Docker）：コンテナ内は `0.0.0.0` で待ち受けますが、`docker-compose.yml` では `127.0.0.1:${MCP_HTTP_PORT}` にのみ公開するためデフォルトではローカル専用です。LAN/WAN に開放する場合はポートマッピングを `"0.0.0.0:6280:6280"` などに変更し、ファイアウォールやリバースプロキシ・認証を必ず併用してください。

### ヘルスチェック

```bash
curl http://localhost:6280/health
```

### Transports モードの違い

| 項目 | stdio | Streamable HTTP |
| --- | --- | --- |
| 接続方式 | 標準入出力 | HTTP/SSE |
| 用途 | ローカル CLI / デスクトップツール | リモートエージェント、ブラウザ統合 |
| セッション管理 | 単一接続 | TTL 付き複数セッション |
| ポート要件 | 不要 | 必須 |

### 開発ショートカット

```bash
# MCP Inspector と同時に HTTP サーバーを起動
# 127.0.0.1:6280/mcp
npm run http
```

## 動作確認

1. TouchDesigner で `mcp_webserver_base.tox` を含むプロジェクトを起動
2. 利用する AI エージェント（Claude Desktop / Claude Code / Codex など）を起動
3. MCP サーバーがリストに表示されているか確認

表示されない場合:

- AI エージェントを再起動
- TouchDesigner / WebServer DAT が動作しているか確認
- ログをチェックしてエラー内容を把握

![Nodes List](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/nodes_list.png)

## トラブルシューティング

### バージョン互換性

セマンティックバージョニングで互換性を確認しています。エラーが出た場合は以下を試してください。

1. [TouchDesigner セットアップ](#touchdesigner-セットアップ全方法共通)を再度実施してください。
2. TouchDesigner から古い `mcp_webserver_base` を削除し、最新版の `.tox` を再インポート
3. TouchDesigner と AI エージェントを再起動

詳しい互換性ルールは README の
[Troubleshooting version compatibility](https://github.com/8beeeaaat/touchdesigner-mcp#troubleshooting-version-compatibility) を参照してください。

### 接続エラー

[Troubleshooting connection errors](https://github.com/8beeeaaat/touchdesigner-mcp#troubleshooting-connection-errors) を参照。

### その他

- 既知の問題は [GitHub Issues](https://github.com/8beeeaaat/touchdesigner-mcp/issues) を確認
- 追加の背景情報は [README](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/README.md) を参照

## 開発者向けセットアップ

開発ワークフローやローカル設定は **[開発者ガイド](development.ja.md)** にまとめています。
