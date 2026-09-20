# TouchDesigner MCP

[![Version](https://img.shields.io/npm/v/touchdesigner-mcp-server?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)
[![Downloads](https://img.shields.io/npm/dt/touchdesigner-mcp-server.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)

TouchDesignerのためのMCP(Model Context Protocol) サーバー実装です。AIエージェントがTouchDesignerプロジェクトを制御・操作できるようになることを目指しています。

[English](README.md) / [日本語](README.ja.md)

## クイックスタート

TouchDesigner MCP を使うと、AI アシスタントが起動中の TouchDesigner プロジェクトを直接読み書きできます（ネットワークの把握、ノードの作成・接続、Python の実行、エラーの確認など）。セットアップは 2 ステップです。TouchDesigner にコンポーネントを追加し、普段お使いの AI アプリをつなぎます。

### ステップ 1 — TouchDesigner にコンポーネントを追加する

どの AI アプリを使う場合でも、この作業は共通です。

1. [最新リリース](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest)から **touchdesigner-mcp-td.zip** をダウンロードし、保管しておける場所に展開します。
2. 展開したフォルダーはそのままにしてください。`mcp_webserver_base.tox` は隣にある `modules/` フォルダーを読み込むため、`.tox` ファイルだけを別の場所に移すと動作しません。
3. `mcp_webserver_base.tox` を TouchDesigner プロジェクトにドラッグします。配置先は `/project1` がおすすめです。

動画付きの手順と読み込みの確認方法は[インストールガイド](docs/installation.ja.md#touchdesigner-セットアップ全方法共通)にあります。

> Claude Code または Codex CLI をお使いなら、この作業をアシスタントに任せることもできます。Claude Code では `/touchdesigner:launch`、Codex では「TouchDesigner を起動して」と依頼すれば、コンポーネントをダウンロードし、読み込んだ状態で TouchDesigner を起動します。ただし開くのは新規プロジェクトなので、既存のプロジェクトに導入する場合は上記の手順で行ってください。

### ステップ 2 — 普段お使いの AI アプリをつなぐ

| お使いのアプリ | つなぎ方 | ターミナル操作 |
| :------------- | :------- | :------------- |
| **Claude Desktop** | [ダウンロードしたファイルをダブルクリック](#claude-desktop) | 不要 |
| **Claude Code** | [`touchdesigner` プラグインを導入](#claude-code) | 必要 |
| **Codex CLI** | [`touchdesigner` プラグインを導入](#codex-cli) | 必要 |
| **ChatGPT デスクトップアプリ**（Work / Codex） | [Codex CLI でマーケットプレイスを登録](#chatgpt-デスクトップアプリwork--codex) | 必要 |
| **ChatGPT（Web）** | [セキュアトンネル経由で接続](docs/openai-plugin.md#chatgpt-connect-the-local-server)（上級者向け） | 必要 |
| その他の MCP クライアント | [インストールガイド](docs/installation.ja.md) | 多くの場合必要 |

「ターミナル操作」とは、ターミナル（macOS）や PowerShell（Windows）にコマンドを入力することです。慣れていない場合は、ターミナルをまったく使わない Claude Desktop の手順をおすすめします。

#### Claude Desktop

ターミナル操作も設定ファイルの編集も不要です。

1. [最新リリース](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp.mcpb)から **touchdesigner-mcp.mcpb** をダウンロードします。
2. ファイルをダブルクリックすると、Claude Desktop に拡張機能として追加されます。
3. Claude Desktop を再起動し、新しいチャットで「TouchDesigner の接続を確認して」と依頼します。

接続先ポートの既定値は `9981` です。WebServer DAT で別のポートを使っている場合は、拡張機能の設定で変更してください。詳細は[方法1: MCP Bundle](docs/installation.ja.md#方法1-mcp-bundleclaude-desktop-限定)を参照してください。

#### Claude Code

**Node.js** が必要です。[nodejs.org](https://nodejs.org/) から現行の LTS 版をインストールしてください（対応は 22.18 以降の 22 系・24 系・26 以降。23.x や 25.x などの奇数リリースは非対応です）。

このリポジトリは Claude Code のプラグインマーケットプレイスも兼ねています。**touchdesigner** プラグインが MCP サーバーの導入と設定を代行するため、設定 JSON の手書き、リポジトリのクローン、npm ビルドはいずれも不要です。

```bash
claude plugin marketplace add 8beeeaaat/touchdesigner-mcp
claude plugin install touchdesigner@touchdesigner-mcp
```

新しいセッションを開始し、`/touchdesigner:setup` で接続を検証するか、`/touchdesigner:launch` でコンポーネントを読み込んだ状態の TouchDesigner を起動します。

プラグイン自体の設定とトラブルシューティングは [plugin/touchdesigner/README.md](plugin/touchdesigner/README.md) を参照してください。

#### Codex CLI

**Node.js**（[nodejs.org](https://nodejs.org/) の現行 LTS 版。22.18 以降の 22 系・24 系・26 以降）と [Codex CLI](https://developers.openai.com/codex/cli) が必要です。このリポジトリの Codex マーケットプレイスから **touchdesigner** プラグインを導入します。npm ビルドは不要です。

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
codex plugin add touchdesigner@touchdesigner-openai
```

新しいセッションを開始し、「TouchDesigner の接続を確認して」や「TouchDesigner を起動して」と依頼してください。MCP サーバーに加えて、接続確認・起動・デバッグ・画像取得・プロジェクト概要・パフォーマンス計測のスキルが利用できます。Codex には `/touchdesigner:` のスラッシュコマンドはありません。通常の言葉で依頼するか、クライアントのスキル選択画面から選んでください。

設定と ChatGPT 接続は [OpenAI プラグインガイド](docs/openai-plugin.md)を参照してください。

#### ChatGPT デスクトップアプリ（Work / Codex）

デスクトップアプリはローカルプラグインに対応していますが、登録作業は **Codex CLI** から行います。Codex CLI はターミナル用の別ツールで、ChatGPT アプリには同梱されていません。[Codex CLI のセットアップ](https://developers.openai.com/codex/cli)からインストールし、次を実行します。

```bash
codex plugin marketplace add 8beeeaaat/touchdesigner-mcp
```

1. ChatGPT デスクトップアプリを再起動します。
2. Work / Codex の **Plugins Directory** を開き、配布元に **TouchDesigner**（`touchdesigner-openai`）を選びます。
3. その配布元から **TouchDesigner** プラグインをインストールし、プラグインを有効にした新しいローカル会話で「TouchDesigner の接続を確認して」と依頼します。

Codex CLI ですでに登録済みなら、コマンドの実行は不要です。ローカルマーケットプレイスが表示されるかどうかは、クライアントのバージョンとワークスペースの設定に依存します。[公式の登録手順](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli)も参照してください。Web・クラウド上の会話では、[ChatGPT の接続設定](docs/openai-plugin.md#chatgpt-connect-the-local-server)が必要です。

### アップデート

すでに利用中の方は、[最新リリースのアップデート手順](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest#for-updates-from-previous-versions)を参照してください。

## 概要

[![demo clip](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/particle_on_youtube.png)](https://youtu.be/V2znaqGU7f4?si=6HDFbcBHCFPdttkM&t=635)

TouchDesigner MCPは、AIモデルとTouchDesigner WebServer DAT 間のブリッジとして機能し、AIエージェントが以下のことが可能になります

- ノードの作成、変更、削除
- ノードプロパティやプロジェクト構造の照会
- PythonスクリプトによるTouchDesignerのプログラム的制御

## MCPサーバーの機能

このサーバーは、Model Context Protocol (MCP) を通じてTouchDesigner への操作、および各種実装ドキュメントへの参照を可能にします。

### ツール (Tools)

ツールは、AIエージェントがTouchDesignerでアクションを実行できるようにします。

| ツール名                    | 説明                                           |
| :-------------------------- | :--------------------------------------------- |
| `create_td_node`            | 新しいノードを作成します。                     |
| `delete_td_node`            | 既存のノードを削除します。                     |
| `describe_td_tools`         | 利用可能なTouchDesignerツールのマニフェストを生成します。 |
| `exec_node_method`          | ノードに対してPythonメソッドを呼び出します。   |
| `execute_python_script`     | TD内で任意のPythonスクリプトを実行します。     |
| `get_td_class_details`      | TD Pythonクラス/モジュールの詳細情報を取得します。 |
| `get_td_classes`            | TouchDesigner Pythonクラスのリストを取得します。 |
| `get_td_info`           | TDサーバー環境に関する情報を取得します。       |
| `get_td_module_help`        | TouchDesignerモジュール/クラスのPython help()ドキュメントを取得します。 |
| `get_td_node_errors`        | ノードとその全子孫のエラー**および警告**をチェックします。ファイル欠落・参照先 op の不在・シェーダのコンパイル失敗は警告として報告されるため、エラーが無いことは健全を意味しません。 |
| `get_td_node_parameters`    | 特定ノードのパラメータを取得します。           |
| `get_td_nodes`              | 親パス内のノードを取得します（オプションでフィルタリング）。 |
| `get_top_image`             | TOPノードの現在の出力を画像として取得します。  |
| `update_td_node_parameters` | 特定ノードのパラメータを更新します。           |

### プロンプト (Prompts)

プロンプトは、AIエージェントがTouchDesignerで特定のアクションを実行するための指示を提供します。

| プロンプト名                | 説明                                           |
| :-------------------------- | :--------------------------------------------- |
| `Search node`               | ノードをファジー検索し、指定されたノード名、ファミリー、タイプに基づいて情報を取得します。 |
| `Node connection`          | TouchDesigner内でノード同士を接続するための指示を提供します。 |
| `Check node errors`               | 指定されたノードのエラーをチェックします。子ノードがあれば再帰的にチェックします。           |

### リソース (Resources)

未実装

## 開発者向け

ローカル環境構築やクライアント設定、コード生成ワークフローなどの詳細は **[開発者ガイド](docs/development.ja.md)** を参照してください。

## トラブルシューティング

### バージョン互換性のトラブルシューティング

MCP サーバーと TouchDesigner コンポーネントは**独立した2つのバージョン軸**で管理されています: npm パッケージバージョンと、MCP サーバー ↔ `.tox` コンポーネント間の契約である **API バージョン**です。各リリースは同梱する API バージョン（`expectedApiVersion`）とサポートする最小バージョン（`minApiVersion`、現在 1.3.0）を宣言し、接続されたコンポーネントの API バージョンはこの2つの値と比較されます。**npm パッケージバージョン自体は互換性判定に関与しない**ため、MCP サーバーの更新だけでサポート範囲内のコンポーネントが使えなくなることはありません。

| API Server（コンポーネント） | 条件 | 動作 | ステータス |
|------------------------------|------|------|-----------|
| = expected API バージョン | 同梱 `.tox` と一致 | ✅ 無音で正常動作 | 互換 |
| 最小以上、expected 未満 | コンポーネントが古い | ⚠️ レスポンスに「Update Recommended」通知を付加、実行継続 | 警告 |
| expected より新しい（同一 MAJOR） | コンポーネントが新しい | ⚠️ MCP サーバーの更新を推奨する警告、実行継続 | 警告 |
| expected より上の MAJOR | 新しい API 世代 | ❌ 実行停止 — MCP サーバーを更新してください | エラー |
| 最小未満（またはバージョン情報なし） | 古すぎる | ❌ 実行停止 — コンポーネントを更新してください | エラー |

- **互換性エラーを解決するには：**
  1. リリースページから最新の [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip) をダウンロードします。
  2. 既存の `touchdesigner-mcp-td` フォルダを削除し、新しく展開した内容に置き換えます。
  3. TouchDesignerプロジェクトから古い `mcp_webserver_base` コンポーネントを削除し、新しいフォルダから `.tox` をインポートします。
  4. TouchDesignerとMCPサーバーを実行しているAIエージェント（例：Claude Desktop）を再起動します。

- **開発者向け：** ローカルで開発している場合は、`package.json` を編集した後に `npm run version` を実行してください（または単に `npm version ...` を使用してください）。これにより、Python API（`pyproject.toml` + `td/modules/utils/version.py`）、`mcpCompatibility.expectedApiVersion`、MCPバンドルマニフェスト、およびレジストリメタデータが同期され、ランタイム互換性チェックが成功するようになります。

互換性チェックの内部動作については [Version Compatibility Verification](docs/architecture.md#version-compatibility-verification) も参照してください。

### 接続エラーのトラブルシューティング

- `TouchDesignerClient` は接続に失敗した互換性チェック結果を **最大60秒間キャッシュ**し、その間のツール呼び出しでは同じエラーを再利用して TouchDesigner への無駄な負荷を避けます。TTL が切れると自動的に再試行します。
- MCP サーバーが TouchDesigner に接続できない場合は、次のようなガイド付きメッセージが表示されます：
  - `ECONNREFUSED` / "connect refused": TouchDesigner を起動し、`mcp_webserver_base.tox` からインポートした WebServer DAT がアクティブか、ポート設定（デフォルト `9981`）が正しいか確認してください。
  - `ETIMEDOUT` / "timeout": TouchDesigner の応答が遅い、またはネットワークが詰まっています。TouchDesigner/ WebServer DAT の再起動やネットワーク状況の確認を行ってください。
  - `ENOTFOUND` / `getaddrinfo`: ホスト名が解決できません。特別な理由がなければ `127.0.0.1` を使用してください。
- これらの詳細なエラーテキストは `ILogger` にも出力されるため、MCP 側のログを確認すれば TouchDesigner に到達する前に止まった理由を把握できます。
- 問題を解決したら再度ツールを実行するだけで、キャッシュされたエラーがクリアされて接続チェックがやり直されます。

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
