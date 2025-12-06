# TouchDesigner MCP Server 開発者向けガイド

ローカル開発環境の構築手順、各 MCP クライアント設定、プロジェクト構成、コード生成ワークフロー、バージョン管理のポイントをこのドキュメントに集約しました。コンポーネント構成の概要は **[アーキテクチャ](./architecture.md)** を参照してください。

## 開発のクイックスタート

1. **環境設定:**

   ```bash
   # リポジトリをクローンして依存関係をインストール
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   npm install
   ```

2. **ビルド:**

   ```bash
   make build        # Docker-based build（推奨）
   # または
   npm run build     # Node.js-based build
   ```

3. **利用可能なコマンド:**

   ```bash
   npm run test      # ユニットテストと統合テスト
   npm run dev       # デバッグ用の MCP Inspector
   ```

**注意:** コードを更新した場合は、MCP サーバーと TouchDesigner の両方を再起動してください。

## ローカル MCP クライアント設定

ローカルビルドした MCP サーバーへ接続するための設定例です。

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "touchdesigner-stdio": {
      "command": "npx",
      "args": [
        "-y",
        "/path/to/your/touchdesigner-mcp/dist/cli.js",
        "--stdio",
        "--port=9981"
      ]
    },
    "touchdesigner-http-npx": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:6280/mcp"
      ]
    }
  }
}
```

### Claude Code (`~/.claude.json`)

```json
{
  "mcpServers": {
    // claude mcp add -s user touchdesigner-stdio -- npx -y /path/to/your/touchdesigner-mcp/dist/cli.js --stdio --port=9981
    "touchdesigner-stdio": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "/path/to/your/touchdesigner-mcp/dist/cli.js",
        "--stdio",
        "--port=9981"
      ],
      "env": {}
    },
    // claude mcp add -s user --transport http touchdesigner-http http://localhost:6280/mcp
    "touchdesigner-http": {
      "type": "http",
      "url": "http://localhost:6280/mcp"
    },
    // claude mcp add -s user touchdesigner-http-npx -- npx mcp-remote http://localhost:6280/mcp
    "touchdesigner-http-npx": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:6280/mcp"
      ],
      "env": {}
    }
  }
}
```

### Codex (`~/.codex/config.toml`)

```toml
# codex mcp add touchdesigner-stdio -- npx -y /path/to/your/touchdesigner-mcp/dist/cli.js --stdio --port=9981
[mcp_servers.touchdesigner-stdio]
command = "npx"
args = ["-y", "/path/to/your/touchdesigner-mcp/dist/cli.js", "--stdio", "--port=9981"]

# codex mcp add touchdesigner-http --url http://localhost:6280/mcp
[mcp_servers.touchdesigner-http]
url = "http://localhost:6280/mcp"

# codex mcp add touchdesigner-http-npx -- npx mcp-remote http://localhost:6280/mcp
[mcp_servers.touchdesigner-http-npx]
command = "npx"
args = ["mcp-remote", "http://localhost:6280/mcp"]
```

## 開発ワークフロー

1. **クローン & 依存関係インストール**

   ```bash
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   npm install
   ```

2. **ビルド**

   ```bash
   npm run build  # コード生成を含むフルビルド
   # または
   make build     # Docker ベースのビルド
   ```

3. **テスト / Inspector**

   ```bash
   npm test       # すべてのテストを実行
   npm run dev    # MCP Inspector を起動
   ```

詳細な開発コマンドは `CLAUDE.md` を参照してください。

## プロジェクト構造

```
├── src/                       # MCP サーバーのソースコード
│   ├── api/                  # TouchDesigner WebServer 向け OpenAPI 仕様
│   ├── core/                 # ロガー / エラーハンドリングなどのコアユーティリティ
│   ├── features/             # MCP 機能実装
│   │   ├── prompts/         # プロンプトハンドラ
│   │   ├── resources/       # リソースハンドラ
│   │   └── tools/           # ツールハンドラ (例: tdTools.ts)
│   ├── gen/                  # OpenAPI スキーマから生成されたコード
│   ├── server/               # MCP サーバーロジック
│   ├── tdClient/             # TouchDesigner 接続 API クライアント
│   ├── index.ts              # Node.js エントリーポイント
│   └── ...
├── td/                        # TouchDesigner 関連ファイル
│   ├── modules/              # TouchDesigner 用 Python モジュール
│   │   ├── mcp/              # MCP リクエストを処理するコアロジック
│   │   │   ├── controllers/ # API リクエストコントローラ
│   │   │   └── services/    # ビジネスロジック
│   │   ├── td_server/        # OpenAPI から生成された Python モデルコード
│   │   └── utils/            # 共有 Python ユーティリティ
│   ├── templates/             # Python コード生成用 Mustache テンプレート
│   ├── genHandlers.js         # generated_handlers.py 生成用 Node.js スクリプト
│   ├── import_modules.py      # TouchDesigner へモジュールを読み込むヘルパー
│   └── mcp_webserver_base.tox # TouchDesigner コンポーネント
├── tests/                      # テストコード
│   ├── integration/
│   └── unit/
└── orval.config.ts             # Orval 設定 (TS クライアント生成)
```

## API コード生成ワークフロー

このプロジェクトは OpenAPI ベースのコード生成ツール（Orval / openapi-generator-cli）を使用します。

**API 定義:** Node.js MCP サーバーと TouchDesigner 内の Python サーバー間の契約は `src/api/index.yml` に定義されています。

1. **Python サーバー生成 (`npm run gen:webserver`):**
    - Docker 経由で `openapi-generator-cli` を実行。
    - `src/api/index.yml` を読み込み、`td/modules/td_server/` に Python サーバーのスケルトンを生成。
    - WebServer DAT 内で動作するコードであり、Docker が必要です。
2. **Python ハンドラ生成 (`npm run gen:handlers`):**
    - `td/genHandlers.js` と Mustache テンプレート (`td/templates/`) を使用。
    - 生成された Python サーバーコードまたは OpenAPI 仕様を読み込み、`td/modules/mcp/controllers/generated_handlers.py` を生成。
3. **TypeScript クライアント生成 (`npm run gen:mcp`):**
    - `openapi-generator-cli` がバンドルしたスキーマを元に Orval が API クライアントと Zod スキーマを生成。
    - Node.js サーバーが WebServer DAT にアクセスするための型付きクライアント (`src/tdClient/`) を作ります。

`npm run build` は必要なコード生成 (`npm run gen`) をすべて実行し、その後 TypeScript コンパイル (`tsc`) を行います。

## バージョン管理

- `package.json` が Node.js MCP サーバー / TouchDesigner Python API / MCP バンドル / `server.json` のバージョン情報の単一ソースです。
- `npm version <patch|minor|major>`（または `npm run gen:version`）を使用してバージョンを上げると、`pyproject.toml`、`td/modules/utils/version.py`、`mcpb/manifest.json`、`server.json` が同期されます。
- GitHub のリリースワークフロー（`.github/workflows/release.yml`）は `v${version}` でタグ付けし、同じバージョンから `touchdesigner-mcp-td.zip` / `touchdesigner-mcp.mcpb` を公開します。リリース前に必ず同期ステップを実行し、すべての成果物が一致するようにしてください。
