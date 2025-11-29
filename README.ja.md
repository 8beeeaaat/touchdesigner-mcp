# TouchDesigner MCP

TouchDesignerのためのMCP(Model Context Protocol) サーバー実装です。AIエージェントがTouchDesignerプロジェクトを制御・操作できるようになることを目指しています。

[English](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/README.md) / [日本語](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/README.ja.md)

## 概要

[![demo clip](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/particle_on_youtube.png)](https://youtu.be/V2znaqGU7f4?si=6HDFbcBHCFPdttkM&t=635)

TouchDesigner MCPは、AIモデルとTouchDesigner WebServer DAT 間のブリッジとして機能し、AIエージェントが以下のことが可能になります

- ノードの作成、変更、削除
- ノードプロパティやプロジェクト構造の照会
- PythonスクリプトによるTouchDesignerのプログラム的制御

## アーキテクチャ

```mermaid
flowchart LR
    A["🤖<br/>MCP client<br/>(Claude / Codex / ...)"]

    subgraph S [Node.js MCP server]
      B1["🧰<br/>Tools & prompts<br/>(src/features/tools)"]
      B2["🖌️<br/>Presenters & formatters<br/>(markdown output)"]
      B3["🌐<br/>OpenAPI HTTP client<br/>(src/tdClient)"]
    end

    subgraph T [TouchDesigner project]
      C1["🧩<br/>WebServer DAT<br/>(mcp_webserver_base.tox)"]
      C2["🐍<br/>Python controllers / services<br/>(td/modules/mcp)"]
      C3["🎛️<br/>Project nodes & parameters<br/>(/project1/...)"]
    end

    A --> B1
    B1 --> B2
    B1 --> B3
    B2 --> A
    B3 <--> C1
    C1 <--> C2
    C2 <--> C3

    %% Higher-contrast colors for readability
    classDef client fill:#d8e8ff,stroke:#1f6feb,stroke-width:2px,color:#111,font-weight:bold
    classDef server fill:#efe1ff,stroke:#8250df,stroke-width:2px,color:#111,font-weight:bold
    classDef td fill:#d7f5e3,stroke:#2f9e44,stroke-width:2px,color:#111,font-weight:bold
    class A client;
    class B1,B2,B3 server;
    class C1,C2,C3 td;
```

## 利用方法

<details>
  <summary>方法1: Claude Desktop + MCP Bundle（推奨）</summary>

##### 1. ファイルをダウンロード

[リリースページ](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest)から以下をダウンロード：

- **TouchDesigner Components**: `touchdesigner-mcp-td.zip`
- **[MCP Bundle](https://github.com/modelcontextprotocol/mcpb) (.mcpb)**: `touchdesigner-mcp.mcpb`

##### 2. TouchDesignerコンポーネントを設置

1. `touchdesigner-mcp-td.zip`を展開
2. 展開したフォルダから`mcp_webserver_base.tox`を操作したいTouchDesignerプロジェクト直下にインポート
   例: `/project1/mcp_webserver_base`となるように配置

<https://github.com/user-attachments/assets/215fb343-6ed8-421c-b948-2f45fb819ff4>

  TouchDesignerのメニューからTextportを起動してサーバーの起動ログを確認できます。

  ![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

##### 3. MCP Bundleをインストール

`touchdesigner-mcp.mcpb`ファイルをダブルクリックしてClaude DesktopにMCP Bundleをインストール

<https://github.com/user-attachments/assets/0786d244-8b82-4387-bbe4-9da048212854>

##### 4. MCP Bundleが自動的にTouchDesignerサーバー接続を処理

**⚠️ 重要:** TouchDesignerコンポーネントのディレクトリ構造は展開した状態を正確に保持してください。`mcp_webserver_base.tox`コンポーネントは`modules/`ディレクトリやその他のファイルへの相対パスを参照しています。

TouchDesignerサーバーとのバージョン不一致が表示された場合は、プロジェクトから既存の `mcp_webserver_base` を削除し、TouchDesigner を再起動してからリリースに同梱された最新の `.tox` を再インポートしてください。

</details>

<details>
  <summary>方法2: npxを利用する</summary>

*Node.jsがインストールされていることが前提となります*

##### 1. TouchDesignerコンポーネントを設置

1. [リリースページ](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest)から`touchdesigner-mcp-td.zip`をダウンロード
2. zipファイルを展開し、`mcp_webserver_base.tox`を操作したいTouchDesignerプロジェクト直下にインポート
   例: `/project1/mcp_webserver_base`となるように配置

<https://github.com/user-attachments/assets/215fb343-6ed8-421c-b948-2f45fb819ff4>

  TouchDesignerのメニューからTextportを起動してサーバーの起動ログを確認できます。

  ![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

##### 2. MCPサーバー設定

*例 Claude Desktop*

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

**カスタマイズ：** `--host`と`--port`引数を追加してTouchDesignerサーバー接続をカスタマイズできます：

```json
"args": [
  "-y",
  "touchdesigner-mcp-server@latest",
  "--stdio",
  "--host=http://custom_host",
  "--port=9982"
]
```

MCP クライアントと TouchDesigner サーバーのバージョンが一致しないと警告された場合は、以前にインポートした `mcp_webserver_base` を削除し、TouchDesigner を再起動したうえで最新の `.tox` を再インポートしてから接続してください。

</details>

### バージョン互換性チェックのトラブルシューティング

MCP クライアントは TouchDesigner コンポーネントが古い場合、`checkVersionCompatibility()` による次のような警告を表示します。

- `⚠️  Server API version unknown - TouchDesigner component update required`
- `⚠️  Server API version could not be parsed - TouchDesigner component update required`
- `⚠️  API version mismatch detected - Major versions differ (update required)`
- `⚠️  Server API version is below minimum compatibility - Update required`

上記いずれかが表示された場合は以下を行ってください。

1. プロジェクトから既存の `mcp_webserver_base` COMP を削除します。
2. TouchDesigner を再起動してモジュールのキャッシュをクリアします。
3. 最新リリース (`touchdesigner-mcp-td.zip`) に含まれる `.tox` を再インポートします。
4. MCP クライアントを再接続してください。TouchDesigner 側が期待する API バージョンを報告すれば警告は解消されます。

<details>
  <summary>方法3: Dockerイメージを利用</summary>

[![tutorial](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/tutorial_docker.png)](https://www.youtube.com/watch?v=BRWoIEVb0TU)

##### 1. リポジトリをクローン

```bash
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
cd touchdesigner-mcp
```

##### 2. Dockerイメージのビルド

```bash
git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
cd touchdesigner-mcp
make build
```

##### 3. TouchDesignerプロジェクトにMCP連携用のAPIサーバーを設置

TouchDesignerを起動し、`td/mcp_webserver_base.tox`コンポーネントを操作したいTouchDesignerプロジェクト直下にインポートします。
例: `/project1/mcp_webserver_base`となるように配置

toxファイルのインポートにより`td/import_modules.py`スクリプトが実行され、APIサーバーのコントローラなどのモジュールがロードされます。

<https://github.com/user-attachments/assets/215fb343-6ed8-421c-b948-2f45fb819ff4>

TouchDesignerのメニューからTextportを起動してサーバーの起動ログを確認できます。

![import](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/textport.png)

##### 4. MCPサーバーのコンテナを起動

```bash
docker-compose up -d
```

##### 5. AIエージェントがDockerコンテナを使用するように設定

*例 Claude Desktop*

```json
{
  "mcpServers": {
    "touchdesigner": {
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

*Windows システムでは、ドライブレターを含めてください。例：`C:\\path\\to\\your\\touchdesigner-mcp\\docker-compose.yml`*

**カスタマイズ：** `--port`引数を追加してTouchDesignerサーバー接続をカスタマイズできます：

  ```json
"args": [
  ...,
  "--stdio",
  "--host=http://host.docker.internal",
  "--port=9982"
]
  ```

</details>

## 接続確認

MCPサーバーが認識されていればセットアップは完了です。
認識されない場合は、AIエージェントを再起動してください。
起動時にエラーが表示される場合は、TouchDesignerを先に起動してからAIエージェントを再度起動してください。
TouchDesignerでAPIサーバーが実行されていれば、エージェントは提供されたツール等を通じてTouchDesignerを使用できます。

## バージョン互換性

MCPサーバーは起動時にTouchDesigner側コンポーネントのAPIバージョンを検証します。

- `package.json` の `compatibility.minimumServerVersion` で許容される最小APIバージョンを定義します。
- `npm run gen:inject-version` で `td/script/injectVersion.js` が npm パッケージのバージョンを `td/modules/mcp/__version__.py` に書き込みます。
- MCPサーバー起動時に TouchDesigner から `apiVersion` を取得し、欠落／下限未満／解析不能な場合は警告して最新の `.tox` を案内します。

TouchDesignerモジュールや npm バージョンを更新した際は、生成スクリプトを再実行して両方のコードを同期させてください。

### ディレクトリ構造要件

**重要:** どの方法（Docker、npx）を使用する場合でも、正確なディレクトリ構造を維持してください：

```
td/
├── import_modules.py          # モジュールローダースクリプト
├── mcp_webserver_base.tox     # メインTouchDesignerコンポーネント
├── modules/                   # Pythonモジュールディレクトリ
│   ├── mcp/                   # MCPコアロジック
│   ├── utils/                 # 共有ユーティリティ
│   └── td_server/             # 生成されたAPIサーバーコード
└── script/                    # TDモジュール関連スクリプト (genHandlers.js / injectVersion.js など)
```

`mcp_webserver_base.tox` コンポーネントは相対パスを使用してPythonモジュールを検索します。これらのファイルを移動したり再編成したりすると、TouchDesignerでインポートエラーが発生します。

![demo](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/nodes_list.png)

## MCPサーバーの機能

このサーバーは、Model Context Protocol (MCP) を通じてTouchDesigner への操作、および各種実装ドキュメントへの参照を可能にします。

### ツール (Tools)

ツールは、AIエージェントがTouchDesignerでアクションを実行できるようにします。

| ツール名                    | 説明                                           |
| :-------------------------- | :--------------------------------------------- |
| `create_td_node`            | 新しいノードを作成します。                     |
| `delete_td_node`            | 既存のノードを削除します。                     |
| `exec_node_method`          | ノードに対してPythonメソッドを呼び出します。   |
| `execute_python_script`     | TD内で任意のPythonスクリプトを実行します。     |
| `get_td_class_details`      | TD Pythonクラス/モジュールの詳細情報を取得します。 |
| `get_td_classes`            | TouchDesigner Pythonクラスのリストを取得します。 |
| `get_td_info`           | TDサーバー環境に関する情報を取得します。       |
| `get_td_node_parameters`    | 特定ノードのパラメータを取得します。           |
| `get_td_nodes`              | 親パス内のノードを取得します（オプションでフィルタリング）。 |
| `update_td_node_parameters` | 特定ノードのパラメータを更新します。           |
| `check_node_errors`         | 指定ノードとすべての子孫ノードに発生中のエラーを再帰的に検出します。**注意:** baseCOMP, containerCOMPなどのコンテナノードでは、動的に生成された子のエラーを検出するために `cook()` が必要な場合があります。 |
| `get_module_help`           | 任意の TouchDesigner クラス/モジュール（`textTOP`, `td.OP` など）の Python `help()` 出力を返します。 |
| `describe_td_tools`         | 登録済み TouchDesigner MCP ツールの一覧をフィルタ付きで取得できます。 |

`get_module_help` は TouchDesigner 内の `help()` 出力をそのまま取得し、トークン効率の良い形式で返すため、外部ドキュメントを開かずに Python API を参照できます。`describe_td_tools` は MCP Inspector と同様のメタデータを返し、ツール名・モジュールパス・パラメータのキーワードで絞り込みが可能です。

### プロンプト (Prompts)

プロンプトは、AIエージェントがTouchDesignerで特定のアクションを実行するための指示を提供します。

| プロンプト名                | 説明                                           |
| :-------------------------- | :--------------------------------------------- |
| `Search node`               | ノードをファジー検索し、指定されたノード名、ファミリー、タイプに基づいて情報を取得します。 |
| `Node connection`          | TouchDesigner内でノード同士を接続するための指示を提供します。 |
| `Check node errors`               | 指定されたノードとすべての子ノードのエラーを再帰的にチェックします。           |

### リソース (Resources)

未実装

## 開発者向け

### 開発のクイックスタート

1. **環境設定:**

   ```bash
   # リポジトリをクローンして依存関係をインストール
   git clone https://github.com/8beeeaaat/touchdesigner-mcp.git
   cd touchdesigner-mcp
   npm install
   ```

2. **プロジェクトをビルド:**

   ```bash
   make build        # Docker-based build（推奨）
   # または
   npm run build     # Node.js-based build
   ```

3. **利用可能なコマンド:**

   ```bash
   npm run test      # ユニットテストと統合テストを実行
   npm run dev       # デバッグ用MCPインスペクターを起動
   ```

**注意:** コードを更新した場合は、MCPサーバーとTouchDesignerの両方を再起動して変更を反映してください。

### プロジェクト構造の概要

```
├── src/                       # MCPサーバーソースコード
│   ├── api/                  # TD WebServerに対するOpenAPI仕様
│   ├── core/                 # コアユーティリティ（ロガー、エラーハンドリング）
│   ├── features/             # MCP機能実装
│   │   ├── prompts/         # プロンプトハンドラ
│   │   ├── resources/       # リソースハンドラ
│   │   └── tools/           # ツールハンドラ (例: tdTools.ts)
│   ├── gen/                  # OpenAPIスキーマから生成されたMCPサーバー向けコード
│   ├── server/               # MCPサーバーロジック (接続, メインサーバークラス)
│   ├── tdClient/             # TD接続API用クライアント
│   ├── index.ts              # Node.jsサーバーのメインエントリーポイント
│   └── ...
├── td/                        # TouchDesigner関連ファイル
│   ├── modules/              # TouchDesigner用Pythonモジュール
│   │   ├── mcp/              # TD内でMCPからのリクエストを処理するコアロジック
│   │   │   ├── controllers/ # APIリクエストコントローラ (api_controller.py, generated_handlers.py)
│   │   │   └── services/    # ビジネスロジック (api_service.py)
│   │   ├── td_server/        # OpenAPIスキーマから生成されたPythonモデルコード
│   │   └── utils/            # 共有Pythonユーティリティ
│   ├── script/               # TouchDesignerモジュール用ヘルパースクリプト
│   │   ├── genHandlers.js    # OpenAPIメタデータからコントローラを生成
│   │   └── injectVersion.js  # npmバージョンをtd/modules/mcp/__version__.pyへ注入
│   ├── templates/             # Pythonコード生成用Mustacheテンプレート
│   ├── import_modules.py      # TDへ APIサーバ関連モジュールをインポートするヘルパースクリプト
│   └── mcp_webserver_base.tox # メインTouchDesignerコンポーネント
├── tests/                      # テストコード
│   ├── integration/
│   └── unit/
└── orval.config.ts             # Orval 設定 (TSクライアント生成)
```

### APIコード生成ワークフロー

このプロジェクトでは、OpenAPIによるコード生成ツール ( Orval / openapi-generator-cli )を使用しています：

**API定義:** Node.js MCPサーバーとTouchDesigner内で実行されるPythonサーバー間のAPI規約は `src/api/index.yml` で定義されます。

1. **Pythonサーバー生成 (`npm run gen:webserver`):**
    - Docker経由で `openapi-generator-cli` を使用します。
    - `src/api/index.yml` を読み取ります。
    - API定義に基づいてPythonサーバーのスケルトン (`td/modules/td_server/`) を生成します。このコードはWebServer DATを介してTouchDesigner内で実行されます。
    - **Dockerがインストールされ、実行されている必要があります。**
2. **Pythonハンドラ生成 (`npm run gen:handlers`):**
    - カスタムNode.jsスクリプト (`td/script/genHandlers.js`) とMustacheテンプレート (`td/templates/`) を使用します。
    - 生成されたPythonサーバーコードまたはOpenAPI仕様を読み取ります。
    - `td/modules/mcp/services/api_service.py` にあるビジネスロジックに接続するハンドラ実装 (`td/modules/mcp/controllers/generated_handlers.py`) を生成します。
    - `td/templates/mcp/api_controller_handlers.mustache` がJSONボディのマージ、camelCase→snake_case変換、適切なサービスメソッド呼び出しを自動で処理します。
3. **TypeScriptクライアント生成 (`npm run gen:mcp`):**
    - `Orval` を使用し `openapi-generator-cli` がバンドルしたスキーマYAMLからAPIクライアントコードとToolの検証に用いるZodスキーマを生成します。
    - Node.jsサーバーが WebServerDAT にリクエストを行うために使用する、型付けされたTypeScriptクライアント (`src/tdClient/`) を生成します。

ビルドプロセス (`npm run build`) は、必要なすべての生成ステップ (`npm run gen`) を実行し、その後にTypeScriptコンパイル (`tsc`) を行います。

## 開発で貢献

ぜひ一緒に改善しましょう！

1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 変更を加える
4. テストを追加し、すべてが正常に動作することを確認（`npm test`）
5. 変更をコミット（`git commit -m 'Add some amazing feature'`）
6. ブランチにプッシュ（`git push origin feature/amazing-feature`）
7. プルリクエストを開く

実装の変更時は必ず適切なテストを含めてください。

## ライセンス

MIT
