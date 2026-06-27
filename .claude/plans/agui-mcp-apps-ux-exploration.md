# AG-UI / MCP Apps 導入によるユーザー体験 検討

> 作成日: 2026-06-28
> ステータス: 検討 (Discovery) — 実装着手前の判断材料
> 軸: **MCP Apps 主軸 + AG-UI 補助**

## 0. TL;DR

- AG-UI と MCP Apps はどちらも「AI エージェントの作業をユーザーに UI として見せる」ための仕組みだが、**本プロジェクトの構造には MCP Apps の方が自然に適合する**。
- 理由: 本プロジェクトの既存ユーザーは Claude Desktop / Cursor / Claude Code といった **既存 MCP ホスト**を使っている。MCP Apps はその iframe 内に UI を埋め込めるが、AG-UI は **自前 Web アプリ (CopilotKit 等) が前提**で既存ホストには届かない。
- **過去に MCP Apps (mcp-ui) の UI 実装が試みられた痕跡がある** (`src/ui` の git 履歴 `cb2fd13 init ui` → Tailwind 統合 → `@mcp-ui/client` 利用)。現在は `.gitignore` 管理外・依存も外れ「棚上げ」状態。本ドキュメントは再開判断の材料を兼ねる。
- 推奨: **MCP Apps を主軸**に UX-B/C/D を実現。UX-A (リアルタイム作業ライブビュー) のように複数ツールにまたがる連続ストリームが本質的に必要な場面のみ **AG-UI または MCP `notifications/progress`** を補助的に検討する。

## 1. 背景: 3 つのプロトコルのレイヤー

| レイヤー | プロトコル | 役割 | 本プロジェクトの現在地 |
|---|---|---|---|
| Agent ↔ ツール/データ | **MCP** | エージェントを外部システムに繋ぐ | ✅ これが touchdesigner-mcp |
| Agent ↔ ツール結果の UI | **MCP Apps (ext-apps)** | ツール結果に `ui://` リソースを同梱しホストが描画 | ❌ 未対応 (過去に試行→棚上げ) |
| Agent ↔ ユーザー向けアプリ | **AG-UI** | エージェントの作業をイベントストリームで自前 UI に流す | ❌ 未対応 |

「AG-UI を導入する」= touchdesigner-mcp を置き換えるのではなく、**TouchDesigner を操る AI エージェントの作業過程を、ユーザーがリアルタイムに見て・止めて・修正できる UI を提供する**こと。MCP Apps も同じ目的を、より MCP に近いレイヤーで解決する。

## 2. 現状 UX の「見えない問題」

ベンチマークログ (S1) と TD 側実装の調査で確認:

1. **ツール呼び出しが無音** — TD ネットワークビューにノードが突然現れるが、何が起きているか不明。
2. **TD 側フィードバックは Textport の `print()` のみ** — `td/modules/mcp/services/api_service.py` のエラーも print 経由。リアルタイム視覚フィードバックなし。
3. **エラー診断の往復が不透明** — `create_td_node` → `get_td_node_errors` → 修正、の試行錯誤が裏で何度走っても見えない。
4. **意図が見えない** — なぜそのノードを作るのか説明されない。

> TouchDesigner は本質的に「ビジュアル・リアルタイム」のツールなのに、AI 連携の体験は「テキストチャットの往復」に閉じている。ここが UI レイヤー導入の最大の刺さりどころ。

## 3. プロトコル比較: AG-UI vs MCP Apps

| 観点 | **AG-UI** | **MCP Apps (ext-apps)** |
|---|---|---|
| レイヤー | Agent ↔ 自前アプリ (MCP の外) | MCP の拡張 (ツール結果に UI を同梱) |
| UI の置き場所 | 自前 Web アプリ (CopilotKit 等) が必須 | 既存ホスト (Claude Desktop 等) の iframe 内 |
| 既存ユーザーへの到達 | ❌ Claude Desktop ユーザーには届かない | ✅ 今のユーザーがそのまま使える |
| レンダリング | SSE/WS イベントを自前 UI が解釈 | ホストが `ui://` リソースを sandboxed iframe 描画 |
| 通信 | SSE/WebSocket イベントストリーム | PostMessage (iframe ↔ ホスト) |
| 連続ストリーム表現 | ✅ 得意 (約16種のイベント型) | △ ツール1回ごとの UI が基本 |
| 公式ホスト対応 | CopilotKit が第一級 (要自作アプリ) | Claude / ChatGPT / VS Code / Goose 等が公式対応 |
| 仕様ステータス | オープン仕様, 多言語 SDK | spec 2026-01-26 Stable, `@modelcontextprotocol/ext-apps` |
| 本プロジェクトの改修量 | 大 (新規フロント + AG-UI サーバー層) | 中 (ツール結果に `ui://` を足す) |
| 過去の試行痕跡 | なし | あり (`src/ui` git 履歴 + `@mcp-ui/client`) |

### 結論
4 つの UX 案を **既存ユーザーに届ける**なら MCP Apps が圧倒的に適合度が高い。AG-UI は「touchdesigner 専用 Web アプリを新規に作る」覚悟があって初めて活きる。

## 4. 提供できる UX 案 (4 案)

### UX-A: エージェント作業ライブビュー
エージェントの作業を実況するパネル。ツール呼び出しのタイムライン、思考の逐次表示、エラー診断の往復を可視化。
- **適合プロトコル**: AG-UI / MCP `notifications/progress` (連続ストリームが本質)
- MCP Apps だけでは複数ツールにまたがる実況に弱い。

### UX-B: Human-in-the-loop 確認・割り込み
破壊的操作 (`delete_td_node`、大量パラメータ変更) の前に確認ボタンを提示。美的判断 (色・動きの好み) を作業途中で注入。
- **適合プロトコル**: MCP Apps (iframe + PostMessage で双方向) / AG-UI (interrupt)
- TD ドメインと特に相性が良い。

### UX-C: Generative UI — ノードプレビュー / 差分
テキストではなく構造化 UI を返す。作成予定ノードグラフのミニプレビュー、パラメータの「変更前→変更後」差分カード、`get_td_nodes` 結果のインタラクティブツリー。
- **適合プロトコル**: MCP Apps (`ui://` リソースの本領)

### UX-D: 非技術者向けオンボーディング UI
`.claude/docs/task.md` の「DXT 対応で非技術ユーザーへ拡張」計画と直結。素のチャットでなく TouchDesigner 専用操作パネル。
- **適合プロトコル**: MCP Apps (既存ホストにそのまま乗る)

### UX × プロトコル 適合マトリクス

| UX 案 | MCP Apps | AG-UI | 備考 |
|---|---|---|---|
| A 作業ライブビュー | △ | ◎ | 連続ストリームは AG-UI 有利 |
| B 確認・割り込み | ◎ | ○ | iframe PostMessage で完結 |
| C Generative UI | ◎ | ○ | `ui://` の本領 |
| D 非技術者向け UI | ◎ | △ | 既存ホスト到達が決定的 |

## 5. 技術的実現性 (既存コードとの接続点)

実現性は **高い**。

| 接続点 | 状況 | ファイル |
|---|---|---|
| HTTP サーバー基盤 | ✅ Express 5 が既にある。`app.get('/agui', sseHandler)` 追加が最小改修 | `src/transport/expressHttpManager.ts:87` |
| SSE の前例 | ✅ 既に GET `/mcp` で SSE 利用 (StreamableHTTP) | `src/transport/transportRegistry.ts` |
| セッション管理 | ✅ UUID ベースのセッション分離あり | `src/transport/transportRegistry.ts` |
| ツール実行の単一通過点 | ✅ `createToolResult` がイベント発火/`ui://` 同梱の差込口 | `src/features/tools/handlers/tdTools.ts:96` |
| ツール定義の一元管理 | ✅ `TOOL_DEFINITIONS` に UI メタを足せる | `src/features/tools/toolDefinitions.ts` |
| 過去の UI 試行 | △ `src/ui` に Vite+React の残骸 (現在は空テンプレ・管理外) | `src/ui/dist` |

### 制約 (正直な共有)
- **TD 側はリクエスト/レスポンス型 HTTP のみ**。TD → MCP の push がない (`src/tdClient/touchDesignerClient.ts`)。ツール実行「中」の進捗 (`TOOL_CALL_DELTA` 相当) を出すには TD 側 WebServer DAT の改修が必要。ツールの開始/終了だけなら MCP サーバー側で完結。
- `src/ui/dist` は Vite テンプレ初期状態 (`vite.svg` のまま) で実質空。フロントは事実上の新規構築。
- MCP Apps はホスト側の対応状況に依存する (Claude Desktop での `ui://` レンダリング対応バージョンを要確認)。

## 6. 推奨アプローチ: MCP Apps 主軸 + AG-UI 補助

```
Phase 1: MCP Apps で UX-C / UX-B の最小実装
  - 1ツール (例: create_td_node or get_td_nodes) の結果に ui:// リソースを同梱
  - Claude Desktop 等の iframe でノードプレビュー / 確認ダイアログを表示
  - 既存ユーザーに追加インストールなしで届く

Phase 2: UX-D 非技術者向けパネルへ拡張
  - 主要ツール群に ui:// を展開、DXT 計画と統合

Phase 3 (条件付き): UX-A リアルタイム性が必要なら AG-UI / progress を補助導入
  - GET /agui (SSE) を expressHttpManager に追加
  - 作業ライブビューが本当に要るか Phase 1-2 のフィードバックで判断
```

## 7. 未解決の判断ポイント (要 意思決定)

以下は読み手 (チーム) の判断が成果を左右する論点。本ドキュメントでは結論を固定しない:

1. **過去の `src/ui` 実装を再開するか、作り直すか** — git 履歴 (`cb2fd13`〜`48bb648`) を掘り起こす価値があるか。
2. **Phase 1 で最初に UI 化するツールはどれか** — `get_td_nodes` (読み取り・低リスク) vs `create_td_node` (体験インパクト大) vs `update_td_node_parameters` (差分 UI が映える)。
3. **UX-A を本当にやるか** — リアルタイム作業ライブビューは魅力的だが TD 側改修コストが高い。費用対効果の見極めが必要。
4. **対応ホストの優先順位** — Claude Desktop 専念か、ChatGPT / VS Code も視野に入れるか。

## 8. 参照

- AG-UI: https://docs.ag-ui.com/introduction / https://github.com/ag-ui-protocol/ag-ui
- MCP Apps: https://github.com/modelcontextprotocol/ext-apps (spec 2026-01-26 Stable, `@modelcontextprotocol/ext-apps`)
- mcp-ui: `@mcp-ui/client` (MCP Apps の事実上の実装 SDK)

### 調査時に読んだ主要ファイル
- `src/transport/expressHttpManager.ts` — HTTP/SSE サーバーのライフサイクルと `/mcp` ルート (UI エンドポイント追加点)
- `src/transport/transportRegistry.ts` — セッション分離ロジック
- `src/features/tools/handlers/tdTools.ts` — `createToolResult` (UI 同梱の差込口)
- `src/features/tools/toolDefinitions.ts` — 全ツール定義
- `src/tdClient/touchDesignerClient.ts` — TD との同期 HTTP 通信 (リアルタイム性の制約)
- `td/modules/mcp/services/api_service.py` — TD 側実装とエラー出力
- `docs/installation.md` / `docs/architecture.md` — 現状のユーザー体験
- `.claude/docs/task.md` — DXT 対応計画 (UX-D と直結)
