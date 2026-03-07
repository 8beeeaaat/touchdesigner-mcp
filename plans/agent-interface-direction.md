# Agent Interface 戦略メモ

## 概要

この文書は、TouchDesigner MCP が今後どの方向へ進むべきかを、`MCP`、`Agent 側 code execution`、`Agent 向け CLI` の 3 つを合わせて整理するための戦略メモです。  
詳細な `code execution` の定義と責務分離は [code-execution-design.md](./code-execution-design.md) を参照してください。本書では、その上に **Agent 向け CLI をどう設計するか** と **このプロジェクトの中長期の立ち位置** を加えます。

結論を先に書くと、このプロジェクトが進むべき方向は **MCP-only** でも **CLI-only** でもありません。  
目指すべきは、**TouchDesigner automation interface for AI agents** として、次の 3 サーフェスを同じコアの上に揃えることです。

| サーフェス | 役割 | 主な利用者 |
| --- | --- | --- |
| MCP Server | エージェントに安全な操作プリミティブを提供する | Claude / Codex / Cursor / ChatGPT などの MCP クライアント |
| Agent 向け CLI | Agent が shell / code execution から直接扱える機械可読インターフェースを提供する | shell を使える coding agent、CI、自動化スクリプト |
| Skills / Context Docs | 不変条件、推奨フロー、危険操作の扱いを明示する | Agent と人間の両方 |

## 外部ソースから得られる示唆

### 1. Justin Poehnelt の記事から取るべきポイント

記事の主張は「MCP を捨てろ」ではなく、**人間向け CLI をそのまま agent に使わせるな** です。  
特に有効なのは次の設計原則です。

- デフォルト出力は機械可読であること
- ドキュメントの代わりに、CLI 自体が runtime で schema / describe を返せること
- コンテキスト窓を守るため、出力を絞れること
- `dry-run`、入力検証、stderr の活用など、agent の誤動作を前提に防御すること
- コマンドだけでなく、skills / context files を同梱すること

### 2. `googleworkspace/cli` から取るべきポイント

`googleworkspace/cli` は、Agent 向け CLI をかなり徹底して設計しています。
参考になるのは次の要素です。

- すべての成功レスポンスを structured JSON として扱う
- `schema` コマンドで request / response を runtime introspection できる
- `--page-all` と NDJSON で大きいレスポンスを stream 処理できる
- `--dry-run` を mutation の前提にする
- `CONTEXT.md` や `SKILL.md` を配布して、agent 用の運用知識まで同梱する

ただし、そのまま真似すべきではありません。  
`googleworkspace/cli` は巨大で汎用な API surface を Discovery Document から動的生成する必要がありますが、TouchDesigner MCP の API surface は **小さく、意図的に curated** されています。  
そのため、このプロジェクトでは **動的コマンド生成より、安定した静的コマンド設計** のほうが適しています。

## 現状評価

このプロジェクトはすでに良い足場を持っています。

- MCP Server が主機能として成立している
- stdio と Streamable HTTP の両方を提供している
- `TouchDesignerClient` が API 呼び出しと互換性管理を集約している
- `describe_td_tools` により、code execution 環境への意識もすでにある

一方で、現状の弱点もはっきりしています。

- `src/cli.ts` は **MCP サーバー起動用 CLI** であり、agent が TouchDesigner 操作を直接呼ぶ CLI ではない
- ツール返り値は主に text 中心で、Agent 側 code execution に最適化された構造化出力が主役ではない
- Resources が未実装で、読み取り系コンテキストの設計余地が大きい
- `execute_python_script` は強力だが、標準導線に近すぎる

つまり現状は、**MCP Server と code execution の入口はあるが、Agent CLI という第三の面がない** 状態です。

## このプロジェクトが進むべき方向

### 基本方針

このプロジェクトは、今後も **MCP Server を中核に維持** するべきです。  
そのうえで、次の 2 点を同時に進めるのが妥当です。

1. MCP の返り値を、Agent 側 code execution が扱いやすい方向へ寄せる
2. Agent 向け CLI を新設し、shell / code execution から直接使える経路を提供する

これは「MCP から CLI へ移行する」という話ではなく、**MCP と CLI を同じコアの別サーフェスとして並立させる** 方針です。

### 目指す構成

中長期では、次の構成を目標にするのが自然です。

- 共通コア  
  `TouchDesignerClient` と、その上に乗る read/write の application service 層
- MCP サーフェス  
  エージェント向けの typed tool / resource / prompt
- CLI サーフェス  
  shell / code execution から利用する agent-first CLI
- Skills / Context  
  推奨フロー、危険操作、出力絞り込みの指針

この構成なら、MCP と CLI が二重実装にならず、責務も明確です。

## Agent 向け CLI の設計方針

### 1. 既存の `touchdesigner-mcp-server` とは別バイナリにする

現在の `touchdesigner-mcp-server` は、あくまで MCP サーバー起動用です。  
これに domain command を混在させると、次の 2 種類の責務が衝突します。

- サーバープロセス起動、transport 設定、セッション管理
- TouchDesigner のノード取得、更新、エラー確認などの domain 操作

そのため、Agent CLI は別バイナリに分離するべきです。  
仮称は `touchdesigner-agent` とします。

### 2. コマンド体系は静的で、TouchDesigner のドメインに寄せる

`googleworkspace/cli` のような runtime discovery ベースではなく、TouchDesigner 向けに安定した command tree を持つほうがよいです。

初期コマンド案:

```bash
touchdesigner-agent nodes list
touchdesigner-agent nodes get
touchdesigner-agent nodes errors
touchdesigner-agent nodes update
touchdesigner-agent nodes create
touchdesigner-agent nodes delete
touchdesigner-agent classes list
touchdesigner-agent classes get
touchdesigner-agent module help
touchdesigner-agent exec node-method
touchdesigner-agent exec python
touchdesigner-agent schema nodes.update
```

この構成は、現在の MCP tool surface と概ね 1 対 1 に対応します。

### 3. 出力は JSON をデフォルトにする

Agent CLI は、人間向け整形よりも機械可読性を優先します。

- stdout: JSON または NDJSON
- stderr: 補助メッセージ、警告、進捗、ヒント
- exit code: 成否を安定して表す

MCP では `detailLevel` や `responseFormat` が重要ですが、CLI では別の考え方に切り替えるべきです。

- CLI のデフォルトは `--output json`
- 人間が読みたい場合のみ `--output text`
- 大きい list 系は `--output ndjson` をサポート

### 4. 入力は raw payload を通せるようにする

Agent は flat flag より JSON payload のほうが扱いやすいです。  
そのため mutation 系は、細かいフラグを大量に生やすより、次を優先します。

- `--params '<json>'` for query / selection
- `--json '<json>'` for request body

例:

```bash
touchdesigner-agent nodes list \
  --params '{"parentPath":"/project1","pattern":"text*"}'

touchdesigner-agent nodes update \
  --params '{"nodePath":"/project1/text1"}' \
  --json '{"properties":{"text":"Hello","font":"Noto Sans"}}'
```

### 5. `schema` / `describe` を first-class にする

Agent が外部ドキュメントを読まなくても済むように、CLI 自体が問い合わせ可能なドキュメントになるべきです。

最低限必要なのは次です。

- `schema nodes.list`
- `schema nodes.update`
- `schema exec.python`

返り値には次を含めます。

- 必須 / 任意の引数
- `--params` / `--json` の shape
- 返り値 shape
- read-only / mutating / unsafe の区分

TouchDesigner MCP は OpenAPI / Zod をすでに持っているため、ここは動的 discovery ではなく **既存 schema を CLI 向けに再公開する** 形が最も筋が良いです。

### 6. context window discipline を CLI 側でも提供する

Agent 向け CLI では、返り値の大きさそのものが DX です。

そのため初期段階から次を持つべきです。

- `--fields` でレスポンス射影
- `--limit` で件数制限
- `--output ndjson` で stream 処理
- list 系で過剰な既定出力を避ける

TouchDesigner API がページングを持たなくても、CLI 側で `fields` と `ndjson` を持つだけで、Agent の扱いやすさは大きく変わります。

### 7. mutation には `--dry-run` を入れる

Agent CLI において `dry-run` はオプションではなく、安全設計の一部です。

対象候補:

- `nodes update`
- `nodes create`
- `nodes delete`
- `exec node-method`
- `exec python`

初期実装では、少なくとも次を満たすべきです。

- payload validation を行う
- 実行対象と予定変更内容を JSON で返す
- 実際の TouchDesigner 更新は行わない

### 8. `execute_python_script` は gated command にする

MCP でも同じですが、CLI でも `exec python` は標準導線の主役にすべきではありません。

- help 上で `unsafe` 扱いにする
- `--allow-unsafe` や `--confirm` を要求する
- 可能なら read-only / normal / unsafe のモードを分ける

CLI ができたからといって、最終的にすべてを Python 文字列で解決する方向へ戻るのは避けるべきです。

### 9. Skills / Context docs を同梱する

`googleworkspace/cli` が `CONTEXT.md` や `SKILL.md` を同梱しているのは重要です。  
このプロジェクトでも、CLI と MCP のどちらを使うか、危険操作前に何を確認するか、出力をどう絞るかを文書として配布する価値があります。

この repo では、既存の prompts を増やすより、**Agent 向けの行動規範を skills / context docs として持つ** ほうが将来性があります。

## 何をしないべきか

次の方向は避けるべきです。

### 1. MCP を捨てて CLI-only にする

TouchDesigner はローカルアプリケーションとのブリッジが本質なので、MCP の価値は依然として大きいです。  
MCP クライアントで直接使える価値まで捨てる理由はありません。

### 2. `touchdesigner-mcp-server` にすべて詰め込む

サーバー起動 CLI と domain CLI を混ぜると、使い方も責務も曖昧になります。  
Agent CLI は別バイナリとして設計するべきです。

### 3. 人間向け convenience flags を大量に増やす

Agent 向け CLI では、細かいフラグの組み合わせより raw JSON payload のほうが安定します。  
人間向けの糖衣構文は最小限に留めるべきです。

### 4. 動的 CLI 生成を最初から目指す

TouchDesigner MCP の強みは curated surface にあります。  
Google Workspace のような巨大 API と違い、まず必要なのは command tree の安定性であり、動的 discovery は初期優先度ではありません。

## MCP 単体で進めるコンテキスト最適化

Agent 向け CLI は別トラックとして進めるべきですが、利用者から多く寄せられている「AI エージェントのコンテキストを早く消費してしまう」という課題に対しては、**この MCP プロジェクト単体でも先に改善できることが多い** です。

まず、現行実装の制約を整理すると次の 4 点です。

- ツール返り値は主に `content[].text` 中心で返される
- `limit` は主に presenter 側の後処理であり、取得前の絞り込みではない
- `detailLevel` / `responseFormat` は有効だが、構造化返却が主役ではない
- 互換性 notice や参照コメントが会話に繰り返し載る余地がある

### CLI を待たずに、この MCP の中で改善できること

#### 1. read 系ツールへの `structuredContent` / `outputSchema` 導入

`get_td_nodes`、`get_td_node_parameters`、`get_td_node_errors` のような read 系ツールは、短い要約 text を残しつつ、別チャネルで機械可読な構造化データを返す形へ寄せるべきです。  
これが入ると Agent は会話本文を読み解かずに code execution で直接フィルタや比較を行えるため、コンテキスト消費を大きく下げられます。

#### 2. `fields` / `keys` / `include` / `exclude` / `pathOnly` のような取得前フィルタの追加

現状の `limit` は返却時の表示量を減らすには効きますが、元データ取得自体を細くしているわけではありません。  
取得前フィルタを導入すれば、Agent が必要な属性だけを最初から要求できるため、MCP 応答そのものを短く保てます。

#### 3. `search_td_nodes` / `summarize_td_errors` / `compare_td_nodes` のような圧縮目的ツールの追加

現在の低レベル primitive は重要ですが、実際によく行われるのは「検索」「集計」「差分確認」です。  
この 3 種を目的別ツールとして持てば、複数回の read と文脈内の暗黙計算を 1 回の圧縮応答へ置き換えられます。

#### 4. read 系ツールのデフォルト出力をより薄くする方針

今の `summary` 基準は妥当ですが、利用実態を考えると read 系の初回応答はもっと薄くてよいです。  
件数、型別集計、先頭数件、次に何を指定すべきかだけ返す設計に寄せると、エージェントが不用意に長い一覧を抱え込まずに済みます。

#### 5. 互換性 notice / reference comment の出力頻度を抑える方針

互換性 notice や reference comment は有用ですが、毎回のやり取りに乗るとコンテキスト効率を悪化させます。  
1 セッション 1 回に制限する、`get_td_info` やエラー時だけに濃く出す、といった出し分けを行えば、必要な安全性を保ちながら会話量を削減できます。

#### 6. Resources 導入による読み取り系コンテキストの分離

class catalog、module help、project snapshot のような大きくて比較的静的な情報は、tools より resources に向いています。  
必要なときに参照する面へ逃がすことで、毎回のツール応答から長文を外し、会話コンテキストの圧迫を防げます。

### 推奨実行順

短期では、次の順で進めるのがもっとも効果的です。

1. `get_td_nodes` / `get_td_node_parameters` / `get_td_node_errors` の構造化返却
2. 取得前フィルタの追加
3. 圧縮目的ツールの追加
4. Resources 化

中長期では CLI を含む 3 サーフェス戦略を採るべきですが、短期の利用体験改善という観点では **MCP 単体の返り値設計とツール粒度の見直しが最優先** です。

## 推奨ロードマップ

### Phase 1. 戦略の明文化

- `code execution` と `Agent CLI` を含めた方向性を文書化する
- この文書と [code-execution-design.md](./code-execution-design.md) を基準にする
- MCP を中核に維持し、CLI を補助ではなく正式サーフェスとして位置づける

### Phase 2. 共有コアの整理

- `TouchDesignerClient` の上に read / write application service 層を置く
- MCP と CLI の両方がその層を使う構造に寄せる
- CLI 実装はサーバーを経由せず、共有コアを直接呼ぶ

### Phase 3. Agent CLI の read-only 版を追加

- `nodes list`
- `nodes get`
- `nodes errors`
- `classes list`
- `classes get`
- `module help`
- `schema ...`

この段階で `--output json`、`--fields`、`--limit`、`--output ndjson` を揃える。

### Phase 4. mutation と safety を追加

- `nodes update`
- `nodes create`
- `nodes delete`
- `exec node-method`
- `exec python`

この段階で `--dry-run` と unsafe gating を入れる。

### Phase 5. Skills / Context と MCP の再調整

- CLI と MCP の使い分けを文書化する
- MCP 側では `structuredContent/outputSchema`、Resources、task-oriented tool を進める
- CLI と MCP の両面から Agent DX を最適化する

## 最終判断

このプロジェクトが進むべき方向は、次の一文で表せます。

**TouchDesigner MCP を、MCP サーバー単体のプロジェクトではなく、TouchDesigner automation interface for AI agents へ進化させる。**

そのために必要なのは次の順序です。

1. MCP を維持する
2. Agent 側 code execution を前提に返り値設計を見直す
3. 別バイナリの Agent CLI を追加する
4. CLI と MCP を同じ共有コアの別サーフェスとして育てる

CLI は MCP の代替ではなく、**同じプロダクトの第二サーフェス** です。  
この方針なら、MCP 論争に振り回されず、このプロジェクト固有の価値を強められます。

## 参考

- Justin Poehnelt, “You Need to Rewrite Your CLI for AI Agents”  
  https://justin.poehnelt.com/posts/rewrite-your-cli-for-ai-agents/
- Google Workspace CLI  
  https://github.com/googleworkspace/cli
- Eric Holmes, “MCP is dead, long live the CLI”  
  https://ejholmes.github.io/2026/02/28/mcp-is-dead-long-live-the-cli.html
- Qiita: 「MCP は死んだ」に対する反論  
  https://qiita.com/sinshutu/items/143711dee36dcf18e81a
