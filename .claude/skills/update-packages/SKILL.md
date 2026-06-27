---
name: update-packages
description: >-
  touchdesigner-mcp の依存パッケージ更新からリリース PR 作成までのワークフロー。
  npm 依存の最新化、npm audit / 脆弱性対応(overrides パターン)、検証、
  バージョンバンプ、CHANGELOG 更新、development → main の PR 作成を一貫して行う。
  「パッケージ最新化」「依存更新」「dependency update」「npm audit 対応」
  「バージョンを上げてリリース」などの依頼時に使用する。
---

# パッケージ更新 → リリース PR 作成フロー

development ブランチ上で作業し、development → main の PR(タイトル: `v1.x.x`)で完結する。
main マージ後は release.yml が自動でタグ作成 → GitHub Release → npm publish するため、
ローカルで作られるタグは push しない。

## 前提知識: バージョンの2系統

| 系統 | ファイル | 更新タイミング |
| --- | --- | --- |
| パッケージバージョン | `package.json`, `mcpb/manifest.json`, `server.json` | 毎リリース |
| MCP API バージョン | `src/api/index.yml` の `info.version`, `td/modules/utils/version.py` の `MCP_API_VERSION`, `pyproject.toml` | サーバー/API に実変更があるリリースのみ |

API バージョンは「TD 側 .tox の再インポートが必要か」をユーザーに伝えるシグナル。
依存更新のみのリリースで上げない。生成済み `openapi.yaml` の `version:` が古いのは意図どおり(stale ではない)。

## Step 1: 更新対象の把握

```bash
npm outdated
```

- 全依存が **exact pin**(範囲指定なし)で管理されている(supply-chain 対策)。
  `npm update` では上がらないため、package.json の各バージョンを手で最新に書き換えてから `npm install` する
- major アップは breaking changes を確認してから。**使われていない依存は更新ではなく削除する**。
  `grep -r <パッケージ名>` で参照ゼロなら削除候補(過去例: `archiver`, `@types/axios`)
- `npm install` 後に msw の postinstall が `public/mockServiceWorker.js` を自動再生成する。
  差分が出たら依存更新コミットに含める(手動編集はしない)

## Step 2: 脆弱性対応

```bash
npm audit fix   # まず非破壊分を適用
```

残った脆弱性は以下で診断する:

- 「fix available via `npm audit fix`」と表示されるのに実行しても直らない場合、
  上流パッケージが脆弱な依存を **exact pin** している。
  `npm view <親パッケージ> dependencies.<脆弱パッケージ>` で確認する
- パッチ版が存在するなら package.json の `overrides` で scoped に強制する:

  ```json
  "overrides": { "concurrently": { "shell-quote": "1.8.4" } }
  ```

  上流が追いついたら撤去する(`npm ls <パッケージ>` で deduped/overridden を確認)。
  過去例: `overrides.axios`(2026-03 追加 → v1.4.7 撤去)、`overrides` 配下の `shell-quote`(v1.4.8 追加)
- audit が `@openapitools/openapi-generator-cli` のダウングレードを提案しても従わない
  (codegen が壊れる。dev-only ツールなので overrides か許容で対処)
- 最終的に `npm audit` 0件を目指す。残す場合は理由を PR に明記する

## Step 3: 検証

```bash
npm run build     # codegen(orval / openapi-generator)→ tsc → mcpb pack
npm run lint      # Biome / tsc / Ruff / Prettier
npm run test:unit
git status        # src/gen, td/modules に codegen 差分がないか確認
```

- codegen ツール(orval 等)の更新後は生成コードの diff の有無が安全性の証拠になる
- `test:integration` の `ECONNREFUSED 127.0.0.1:9981` は TouchDesigner 未起動による環境要因。
  依存更新の検証としてはユニットテスト全パスで足りる

## Step 4: 依存更新コミット

`chore: update dependencies and devDependencies in package.json` + from→to の箇条書き。
対象: `package.json`, `package-lock.json`, `public/mockServiceWorker.js`(差分があれば)。

## Step 5: バージョンバンプ

作業ツリーがクリーンであることを確認してから:

```bash
npm version patch        # バンプ + version:* スクリプト + コミット「1.4.x」+ ローカルタグ
npm run build:mcpb       # 新しい manifest.json で .mcpb を再ビルド
npm run version:mcp      # 新ビルドの sha256 を server.json に再記録
```

サーバー/API 変更がないリリースでは API 側3ファイルを戻す(`npm version` が自動で上げてしまうため):

```bash
git checkout <依存更新コミット> -- src/api/index.yml td/modules/utils/version.py pyproject.toml
```

残りの同期ファイルをコミットする:
`chore: sync version 1.4.x across MCP bundle manifest and server metadata`

既知の制約: `.mcpb` の zip ビルドは非決定的なため、`server.json` の `fileSha256` は
CI が再ビルドして添付する公開アセットと一致しない(v1.4.7 で実証済み)。現行手順では仕様として扱う。

## Step 6: CHANGELOG 更新

`## [1.4.x] - YYYY-MM-DD` を先頭エントリとして追加し、コミットする。
セクション構成と書式は直前のエントリを踏襲する(Changed / Fixed / Removed / Security / Technical。
Technical に依存更新の from→to 一覧)。

注意: ローカルタグ `v1.4.(x-1)` は squash 前の PR ブランチコミットを指していることがあり、
`git diff <タグ>..HEAD` に前リリース分が混入する。差分の根拠は development 上の
**前リリースのマージコミット以降**のコミットにする。

## Step 7: Push + PR 作成

```bash
git push origin development   # タグは push しない
gh pr create --base main --head development --title "v1.4.x" --body "..."
```

PR 本文の構成: Summary(Dependency Updates / Security / Release Chores)+
Verification(lint / build / test の実行結果)。マージは人間が行う。
