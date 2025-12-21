# TouchDesigner MCP

[![Version](https://img.shields.io/npm/v/touchdesigner-mcp-server?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)
[![Downloads](https://img.shields.io/npm/dt/touchdesigner-mcp-server.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/touchdesigner-mcp-server)

TouchDesignerのためのMCP(Model Context Protocol) サーバー実装です。AIエージェントがTouchDesignerプロジェクトを制御・操作できるようになることを目指しています。

[English](README.md) / [日本語](README.ja.md)

## 概要

[![demo clip](https://github.com/8beeeaaat/touchdesigner-mcp/blob/main/assets/particle_on_youtube.png)](https://youtu.be/V2znaqGU7f4?si=6HDFbcBHCFPdttkM&t=635)

TouchDesigner MCPは、AIモデルとTouchDesigner WebServer DAT 間のブリッジとして機能し、AIエージェントが以下のことが可能になります

- ノードの作成、変更、削除
- ノードプロパティやプロジェクト構造の照会
- PythonスクリプトによるTouchDesignerのプログラム的制御

## インストール方法

**[インストールガイド](docs/installation.ja.md)** を参照してください。

アップデートする場合は **[最新リリース](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest#for-updates-from-previous-versions)** の手順を参照してください。

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
| `get_module_help`           | TouchDesignerモジュール/クラスのPython help()ドキュメントを取得します。 |
| `get_td_class_details`      | TD Pythonクラス/モジュールの詳細情報を取得します。 |
| `get_td_classes`            | TouchDesigner Pythonクラスのリストを取得します。 |
| `get_td_info`           | TDサーバー環境に関する情報を取得します。       |
| `get_td_node_errors`        | 指定されたノードとその子ノードのエラーをチェックします。 |
| `get_td_node_parameters`    | 特定ノードのパラメータを取得します。           |
| `get_td_nodes`              | 親パス内のノードを取得します（オプションでフィルタリング）。 |
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

柔軟な互換性チェックのために**セマンティックバージョニング**を使用しています

| MCP Server | API Server | 最小互換APIバージョン | 動作 | ステータス | 備考 |
|------------|------------|----------------|----------|--------|-------|
| 1.3.x | 1.3.0 | 1.3.0 | ✅ 正常動作 | 互換 | 推奨ベースライン構成 |
| 1.3.x | 1.4.0 | 1.3.0 | ⚠️ 警告表示、実行継続 | 警告 | 旧MCP MINORと新API、新機能未対応の可能性 |
| 1.4.0 | 1.3.x | 1.3.0 | ⚠️ 警告表示、実行継続 | 警告 | 新MCP MINORに追加機能がある可能性 |
| 1.3.2 | 1.3.1 | 1.3.2 | ❌ 実行停止 | エラー | APIが最小互換バージョン未満 |
| 2.0.0 | 1.x.x | N/A | ❌ 実行停止 | エラー | MAJORバージョン相違 = 破壊的変更 |

**互換性ルール**:

- ✅ **互換**: 同じMAJORバージョン、かつAPIバージョン ≥ 最小互換バージョン
- ⚠️ **警告**: 同じMAJOR内でMINORまたはPATCHバージョンが異なる（警告表示、実行継続）
- ❌ **エラー**: MAJORバージョンが異なる、またはAPIサーバー < 最小互換バージョン（即座に実行停止、更新が必要）

- **互換性エラーを解決するには：**
  1. リリースページから最新の [touchdesigner-mcp-td.zip](https://github.com/8beeeaaat/touchdesigner-mcp/releases/latest/download/touchdesigner-mcp-td.zip) をダウンロードします。
  2. 既存の `touchdesigner-mcp-td` フォルダを削除し、新しく展開した内容に置き換えます。
  3. TouchDesignerプロジェクトから古い `mcp_webserver_base` コンポーネントを削除し、新しいフォルダから `.tox` をインポートします。
  4. TouchDesignerとMCPサーバーを実行しているAIエージェント（例：Claude Desktop）を再起動します。

- **開発者向け：** ローカルで開発している場合は、`package.json` を編集した後に `npm run version` を実行してください（または単に `npm version ...` を使用してください）。これにより、Python API（`pyproject.toml` + `td/modules/utils/version.py`）、MCPバンドルマニフェスト、およびレジストリメタデータが同期され、ランタイム互換性チェックが成功するようになります。

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
