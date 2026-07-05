---
name: touchdesigner-self-debug
description: >
  TouchDesigner を computer-use で自己起動し、mcp_webserver_base.tox をロードして
  TD 側 Python 機能(api_service のノード操作等)を Textport から直接検証するワークフロー。
  touchdesigner-mcp リポジトリで TD 側コード(td/modules/**)を変更した後、
  実 TD での E2E 検証・セルフデバッグが必要なとき、
  「TD を起動して確認」「実機で検証」「.tox を import して動かす」と言われたときに使う。
  HTTP/WebServer/OpenAPI スキーマを経由せず textport 直呼びで検証する近道を含む。
---

# TouchDesigner 起動＋機能セルフデバッグ

TD 側 Python（`td/modules/**` の `api_service` など）の変更を、**実 TouchDesigner** で
検証するための再現手順。HTTP WebServer を立てずに Textport から直接叩くのが最短経路。

## いつ実行するか

- `td/modules/mcp/services/*.py` など TD 側ロジックを変更し、実機挙動を確認したい
- ユニット/オフライン検証だけでは足りず、実ノードの座標・寸法など TD ランタイム値で照合したい
- CI にも統合テスト(9981 接続前提)にも頼れない新規 worktree で動作確認したい

## 前提と落とし穴（先に知っておく）

1. **`.tox` は実行時にディスクの `td/modules/` を読む**。
   よって `.py` の変更に **`.tox` 再オーサリングは不要**。モジュール再読込 or TD 再起動で反映。
2. **`loadTox()` は `externaltox` パラメータを空にする** → `import_modules.setup()` が
   `No module named 'mcp'` で失敗。→ 手動で setup を再現する（下記 Step 3）。
3. **新規 worktree は生成物が無い** → OpenAPI スキーマ空・`node_modules` 無しで
   HTTP routing は動かない。→ **HTTP を使わず textport 直呼び**で回避（下記 Step 4）。
4. **computer-use のスクショが黒くなる**のは TD が最前面から外れたとき。
   → `open_application("TouchDesigner")` ＋ `switch_display` で復帰。
5. **REPL への複数行ペーストは行分断で壊れる** → 必ず `exec("""...""")` で1文にまとめる。

## Step 1: TD を起動

```
computer-use: request_access(["TouchDesigner"])
computer-use: open_application("TouchDesigner")   # 数秒待つ
computer-use: screenshot                           # 起動確認
```

## Step 2: Textport を開く

macOS メニューバー **Dialogs → "Textport and DATs"** をクリック。
（`Alt+T` は Palette トグルで不確実。メニュー経由が確実）

## Step 3: .tox ロード＋モジュール setup を手動再現

Textport にフォーカスして（`exec("""...""")` で1文化）:

```python
# 3a. ロード
p = op('/project1').loadTox('<ABS_REPO>/td/mcp_webserver_base.tox'); print('LOADED', p)

# 3b. externaltox が空なので手動 setup（import_modules.setup() の中身を再現）
exec("""
import sys, os, yaml
b = op('/project1/mcp_webserver_base')
b.par.externaltox = '<ABS_REPO>/td/mcp_webserver_base.tox'
mp = '<ABS_REPO>/td/modules'; tsp = os.path.join(mp, 'td_server')
[sys.modules.pop(m) for m in list(sys.modules) if m.split('.',1)[0] in ('mcp','utils')]
[sys.path.remove(x) for x in (tsp, mp) if x in sys.path]
sys.path.insert(0, mp); sys.path.insert(0, tsp)
import mcp
sp = os.path.join(mp, 'td_server', 'openapi_server', 'openapi', 'openapi.yaml')
mcp.openapi_schema = yaml.safe_load(open(sp)) if os.path.exists(sp) else {}
print('SETUP_OK', mcp.__file__, 'schema', bool(mcp.openapi_schema))
""")
```

`SETUP_OK .../td/modules/mcp/__init__.py` が出れば `mcp` はローカルから import 成功。
（`schema False` でも textport 直呼び検証には問題なし）

## Step 4: 機能を Textport から直接検証（HTTP 不要）

`api_service` を直接呼び、**実ノードの TD ランタイム値**を読み戻して照合する:

```python
exec("""
import td
from mcp.services.api_service import api_service
_t = op('/project1/align_test')
if _t: _t.destroy()
test = op('/project1').create(td.baseCOMP, 'align_test')
res = [api_service.create_node(test.path, 'circleTOP', 'c%02d'%i, None) for i in range(12)]
boxes = [(c.nodeX, c.nodeY, c.nodeWidth, c.nodeHeight) for c in test.children]
ov = lambda a,b: max(0, min(a[0]+a[2],b[0]+b[2])-max(a[0],b[0]))*max(0, min(a[1]+a[3],b[1]+b[3])-max(a[1],b[1]))
tot = sum(ov(boxes[i],boxes[j]) for i in range(len(boxes)) for j in range(i+1,len(boxes)))
print('E2E children=%d overlap=%s' % (len(boxes), tot))
print('E2E_JUDGE', 'PASS' if tot==0 and len(boxes)==12 else 'FAIL')
""")
```

- `node_type` は **文字列**（例 `'circleTOP'`）を `create_node` に渡せば TD が解決する。
- 判定は**アサーションでなく照合**（reconciliation）で書く: 実座標から overlap 面積を計算し `==0`。
- 既存回避などの追加挙動は、同じコンテナへ追記して `after == before + N` で確認。

## Step 5: 併走させる「オフライン judge」（TD 不要・決定論）

TD ランタイムに依存しない判定核は、**`td` を import しない純モジュール**に切り出し、
`importlib` でファイル直読みして system python3 で検証する（追加依存ゼロ）:

```python
# judge.py — node_layout.py を importlib でパス直読み（mcp パッケージ __init__ を回避）
import importlib.util, os, sys
spec = importlib.util.spec_from_file_location(
    "mod", os.path.join(sys.argv[1], "td/modules/mcp/services/node_layout.py"))
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
# ... 純関数を叩いて overlap==0 等を数値照合し PASS/FAIL を exit code に
```

TD 側 judge は「統合の確認」、オフライン judge は「不変条件の証明」。二段で回す。

## 後片付け

- 検証コンテナ（例 `/project1/align_test`）は**未保存の NewProject.toe 上**なら
  保存せず TD を閉じれば破棄される。明示削除は `op('/project1/align_test').destroy()`。
- TD は開いたままでよい（次の検証で再利用可能）。

## 関連

- グローバル memory: `loadtox-externaltox-gotcha` / `fresh-worktree-needs-gen-for-schema` / `tox-embeds-import-modules-dat`
- 生成パイプライン: `npm run gen`（HTTP 経由の検証が必要なときのみ）
