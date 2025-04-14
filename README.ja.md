# TouchDesigner MCP

TouchDesignerのためのMCP(Model Context Protocol) サーバー実装です。AIアシスタントがTouchDesignerプロジェクトを制御・操作できるようになることを目指しています。

## 概要

TouchDesigner MCPは、AIモデルとTouchDesignerの間のブリッジとして機能し、AIアシスタントが以下のことを行えるようにします：
- TouchDesignerプロジェクト内のノードの作成、変更、削除
- ノードプロパティやプロジェクト構造の照会
- 標準化されたプロトコルを通じたTouchDesigner操作のプログラム的制御

この実装はModel Context Protocolの標準に従い、AIモデルとTouchDesignerのパワフルなリアルタイムビジュアル開発環境との間でシームレスな統合を提供することを目指しています。

## 前提条件

- Node.js
- TouchDesigner（最新の安定版を推奨）

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
cd touchdesigner-mcp

# 依存関係のインストール
npm install

# 環境設定ファイルの設置
cp dotenv .env

# プロジェクトのビルド
npm run build
```

## 使い方

### TouchDesignerのセットアップ

1. TouchDesignerを開く
2. 提供されている`td/mcp_webserver_base.tox`コンポーネントをインポート
3. TouchDesignerのWebサーバーが実行されていることを確認（このコンポーネントはMCPサーバーとTouchDesigner間の通信を処理します）

> 注意：デフォルトでは、MCPサーバーは`http://localhost:9080`でTouchDesignerに接続します。この接続アドレスを変更する必要がある場合は、`.env`ファイルの`TD_WEB_SERVER_URL`値を修正し、`npm run build`でプロジェクトを再ビルドしてください。

### MCPサーバーの起動

```bash
# CLIモードでサーバーを起動
npm run dev
```

### MCP対応AIアシスタントとの接続
Claude Desktop、Cursor、GitHub Copilotなど

```json
    "servers": {
      "TouchDesigner": {
        "command": "node",
        "args": [
          "/Users/[user_name]/.../touchdesigner-mcp/dist/index.js", // 完全なパス
          "--stdio"
        ],
        "transportType": "stdio",
      }
    }
```

サーバーが起動したら、任意のMCP対応AIアシスタントを接続してTouchDesignerプロジェクトを操作できます。

## プロジェクト構造

```
├── src/               # ソースコード
│   ├── api/           # API仕様とクライアント設定
│   ├── gen/           # 生成されたAPIモデルとエンドポイント
│   ├── schemas/       # ノードスキーマ定義
│   ├── tdClient/      # TouchDesignerクライアント実装
│   └── ...
├── td/                # TouchDesignerコンポーネント
│   └── mcp_webserver_base.tox  # TouchDesigner用Webサーバーコンポーネント
└── ...
```

## MCPサーバーの機能

### 現在の機能

#### ツール（Tools）
- **create_td_node**: TouchDesignerに新しいTOPノードを作成（現在はTOPファミリーのみサポート）
- **delete_td_node**: 指定されたパスのノードを削除
- **get_td_server_info**: TouchDesignerのサーバー情報を取得
- **get_td_project_nodes**: 現在のプロジェクト内のすべてのノードを取得
- **get_td_default_node_parameters**: 特定のノードタイプのデフォルトパラメータを取得
- **get_td_node_property**: 特定のノードのプロパティを取得
- **update_td_node_properties**: ノードパラメータを更新（ノード間接続も含む）

#### プロンプト（Prompts）
- **check-node**: 特定のノードに関する情報を確認するためのプロンプト
  - 使用例: `nodeName`、`nodeFamily`、`nodeType`の情報を提供すると、そのノードに関する説明や使用方法のガイダンスが得られます

#### リソース（Resources）
- **node_schemas** (`tdmcp:///node_schemas`): TouchDesignerノードのスキーマ定義を提供
  - 利用可能なノードタイプとそのパラメータの情報
  - AIアシスタントがノード操作コマンドを生成する際に参照される
  - Zodスキーマで定義されており、型安全な操作をサポート

### 現在の制限事項

- Webインターフェースはまだ利用できません - 現在はCLIモードのみサポート
- TouchDesigner Web APIを通じて公開されている操作のみに限定
- 現在はTOPノードの作成のみをサポート（COMP、CHOP、SOP、DAT、MATなどの他のファミリーはまだサポートされていません）
- validateToolParamsメソッドはサポートされていないノードファミリーまたはタイプに対してエラーを発生させます
- DAT直接編集機能はサポートしていません
- 複雑なパラメータタイプに対する限定的なサポート
- カスタムコンポーネント開発のサポートなし

## MCPプロトコル実装の詳細

TouchDesigner MCPは、Model Context Protocol (MCP) の主要な3つの要素を実装しています：

### 1. ツール（Tools）
MCPサーバーは7つのツールを提供し、AIがTouchDesignerを直接操作できるようにします：

| ツール名 | 説明 | パラメータ |
|---------|------|-----------|
| create_td_node | TOPノードの作成 | nodeFamily, nodeType, nodeName（オプション）, parameters（オプション）, connection（オプション） |
| delete_td_node | ノードの削除 | nodePath |
| get_td_server_info | サーバー情報の取得 | なし |
| get_td_project_nodes | プロジェクト内のすべてのノードの取得 | なし |
| get_td_default_node_parameters | ノードタイプのデフォルトパラメータの取得 | nodeFamily, nodeType |
| get_td_node_property | 特定ノードのプロパティ取得 | nodePath |
| update_td_node_properties | ノードのプロパティ更新 | nodePath, parameters（オプション）, connection（オプション） |

### 2. プロンプト（Prompts）
再利用可能なプロンプトテンプレートを提供：

| プロンプト名 | 説明 | 引数 |
|------------|------|-----|
| check-node | ノードの使用法に関するガイダンス | nodeName, nodeFamily, nodeType |

### 3. リソース（Resources）
AIが参照できるデータやコンテンツ：

| リソースURI | 説明 | MIME Type |
|------------|------|-----------|
| tdmcp:///node_schemas | TouchDesignerノードのスキーマ定義 | application/json |

## 開発

### 開発環境のセットアップ

```bash
# インスペクターモードで実行
npm run dev
```

## TouchDesigner WebServer用のAPI

- TouchDesigner WebServerとの通信用APIは、`src/api/index.yml`でOpenAPIスキーマを使用して定義されています
- クライアントコードとZodスキーマは`npm run gen`コマンドを使用して自動生成されます
- TouchDesigner側のPythonクライアントコードの生成オプションも検討中です - Python OpenAPIコード生成の経験がある貢献者を歓迎します！

## 貢献

貢献は歓迎します！貢献方法は以下の通りです：

1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更を加える
4. テストを追加し、すべてが正常に動作することを確認（`npm test`）
5. 変更をコミット（`git commit -m 'Add some amazing feature'`）
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを開く

プロジェクトのコーディング標準に従い、適切なテストを含めてください。

## ライセンス

MIT
