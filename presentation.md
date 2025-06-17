---
marp: true
theme: default
style: |
  section {
    font-size: 28px;
  }
  h1 {
    color: #2c3e50;
  }
  h2 {
    color: #34495e;
  }
  .highlight {
    background-color: #f39c12;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .tech-stack {
    display: flex;
    justify-content: space-around;
    align-items: center;
    margin: 20px 0;
  }
  .tech-item {
    text-align: center;
    padding: 10px;
  }
  .challenge {
    background-color: #e74c3c;
    color: white;
    padding: 10px;
    border-radius: 8px;
    margin: 10px 0;
  }
  .solution {
    background-color: #27ae60;
    color: white;
    padding: 10px;
    border-radius: 8px;
    margin: 10px 0;
  }
  .mermaid { all: unset; }
---

# TouchDesigner MCP Server
## 連携APIがないアプリへのMCP実装の挑戦

**8beeeaaat**
TL会 2025/06/17

---

## そもそも MCP とは？

### 🤔 **Model Context Protocol**
AI エージェントとアプリケーション間の **標準通信プロトコル**

### 📋 **従来の課題**
```
AI Agent → 独自API → App A
AI Agent → 別の独自API → App B
AI Agent → また別のAPI → App C
```

<div class="challenge">
アプリごとに異なるAPI実装 → 開発コストが膨大
</div>

### ✨ **MCP による解決**

<div class="tech-stack">
  <div class="tech-item">
    <strong>AI Agent</strong><br>
    <small>Claude, GPT</small>
  </div>
  <div class="tech-item">
    <strong>⬌ MCP Protocol</strong><br>
    <small>Standard Interface</small>
  </div>
  <div class="tech-item">
    <strong>MCP Servers</strong><br>
    <small>App A, B, C...</small>
  </div>
</div>

<div class="solution">
統一されたプロトコルで複数のアプリケーションと連携
</div>

---

## MCP の構成要素

### 🛠️ **Tools** - 具体的な操作
### 💬 **Prompts** - タスク実行方法の指示
### 📚 **Resources** - 参照可能なデータソース

### 🎯 **TouchDesigner での例**
- **Tools**: ノード作成、削除、パラメータ更新
- **Prompts**: エラーチェック、ノード接続方法
- **Resources**: （今回は未実装）

---

## TouchDesigner とは？

### 🎨 **ノードベース**のビジュアルプログラミング環境
- **リアルタイム** 3D グラフィックス制作
- **VJ**, **メディアアート** で広く使用
- **ノード接続**でデータフローを構築

---

## TouchDesigner の課題

### 🤔 **課題: 学習コストの高さ**
- 独特のノード概念 (TOP, CHOP, SOP...)
- 膨大な Operator 数 (数百種類)
- 複雑な Python API

### 💡 **AI による解決**
自然言語 → ノード操作の自動化

<div class="highlight">
TouchDesigner を AI で操作できれば、創作の民主化が実現！
</div>

---

## 目指すシステム全体像

### 🎯 **Vision: AI-Driven TouchDesigner**

<div class="mermaid">
flowchart TD
    subgraph User ["User Layer"]
        A[👤 クリエイター]
    end
    
    subgraph AI ["AI Layer"]
        B[🤖 AI Agent]
    end
    
    subgraph Communication ["Communication Layer"]
        C[🔌 MCP Server]
        D[🌐 WebServer DAT]
        C --- D
    end
    
    subgraph TouchDesigner ["TouchDesigner Layer"]
        E[🎨 TouchDesigner]
        F[📦 Sphere]
        G[🎬 Movie In]
        H[✨ Effects]
        E --> F --> G --> H
    end
    
    subgraph Output ["Output Layer"]
        I[🖥️ Real-time Visuals]
    end
    
    A -->|自然言語| B
    B -->|MCP Protocol| C
    D -->|Python API| E
    H --> I
    
    classDef userStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef aiStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef commStyle fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
    classDef tdStyle fill:#fce4ec,stroke:#d32f2f,stroke-width:2px,color:#000
    classDef outputStyle fill:#f1f8e9,stroke:#689f38,stroke-width:2px,color:#000
    
    class A userStyle
    class B aiStyle
    class C,D commStyle
    class E,F,G,H tdStyle
    class I outputStyle
</div>

<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10.0.0/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true });
window.addEventListener('vscode.markdown.updateContent', function() { mermaid.init() });
</script>

### 💭 **User Journey**
1. **"パーティクルシステムを作って"** → AI が理解
2. **MCP Tools 実行** → ノード作成・接続・設定
3. **リアルタイム映像生成** → 即座に結果確認

---

## The Challenge: No API, No Problem?

![bg right:40% 80%](https://raw.githubusercontent.com/8beeeaaat/touchdesigner-mcp/main/assets/particle_on_youtube.png)

### 🚫 **TouchDesigner の現実**
- **REST API が存在しない**
- Python API は **内部実行のみ**
- **外部連携手段がない**

<div class="challenge">
どうやって「APIがない」アプリケーションと通信するか？
</div>

---

## 一般的なアプローチの限界

### ❌ **使えない手法**
- REST API / WebSocket: 存在しない
- CLI: なし
- ファイル監視: リアルタイム性に欠ける

### 🤔 **残された選択肢**
内部 Python API を外部に公開する独自ブリッジ

---

## 解決策: WebServer DAT を発見

<div class="solution">
TouchDesigner の隠れた機能「WebServer DAT」を活用！
</div>

### 🔍 **WebServer DAT**
- TouchDesigner **内蔵の HTTP サーバー**
- **内部 Python API** に完全アクセス

### 💡 **アイデア**
WebServer DAT で REST API を実装

---

## WebServer DAT の実装例

```python
# WebServer DAT 内で実行
def onHTTPRequest(webServerDAT, request, response):
    if request['method'] == 'POST' and request['uri'] == '/nodes':
        # TouchDesigner の内部 API を呼び出し
        node = op('/').create(nodeType, nodeName)
        response['data'] = {
            'success': True,
            'node_path': node.path
        }
```

### 🎯 **実現できること**
外部 HTTP リクエスト → TouchDesigner 内部操作

---

## Challenge 1: 複雑なリクエスト処理

<div class="challenge">
WebServer DAT の制約: 単純な文字列ベースの処理のみ
</div>

### 🚫 **Problem**
- JSON パース・ルーティングの手動実装
- エラーハンドリングの統一が困難

---

## Solution: 階層化アーキテクチャ

### ✅ **3層構造**
1. **RequestProcessor** - リクエスト正規化
2. **OpenAPIRouter** - ルーティング
3. **GeneratedHandlers** - 自動生成

```python
# 簡潔なコントローラー実装
class APIControllerOpenAPI:
    def handle_request(self, request):
        normalized = self.request_processor.process(request)
        endpoint = self.router.route(normalized.path)
        handler = getattr(self.generated_handlers, endpoint.name)
        return handler(normalized)
```

### 🎯 **Benefits**
モジュラー設計 + 自動生成

---

## Challenge 2: TouchDesigner の制約

<div class="challenge">
TouchDesigner Python 環境は外部ライブラリの import に制限がある
</div>

### 🚫 **Problem**
- 外部パッケージのインストール不可
- 標準ライブラリのみ使用可能

---

## Solution: ModuleFactory Pattern

### ✅ **動的ローディング + フォールバック**

```python
class ModuleFactory:
    @staticmethod
    def create_module(module_name: str, fallback_class=None):
        try:
            module = importlib.import_module(f'modules.{module_name}')
            return getattr(module, module_name.title() + 'Class')()
        except ImportError:
            if fallback_class:
                return fallback_class()
            raise ImportError(f"Module {module_name} not found")
```

### 🎯 **Strategy**
遅延ローディング + フォールバック機能

---

## Challenge 3: 型安全性の確保

<div class="challenge">
TypeScript (MCP Server) ↔ Python (TouchDesigner) の型安全な通信
</div>

### 🚫 **Problem**
- TypeScript ↔ Python の型安全な通信
- API スキーマの同期が困難

---

## Solution: OpenAPI Schema First

### ✅ **Single Source of Truth**

```yaml
# src/api/index.yml
/nodes:
  post:
    summary: Create a new TouchDesigner node
    requestBody:
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateTdNodeRequest'
```

### 🔄 **3段階コード生成**
1. **Python Flask API** (openapi-generator-cli)
2. **TypeScript Client** (Orval + Zod)
3. **Handler Implementation** (Mustache Template)

<div class="solution">
単一スキーマ → 3言語コード自動生成 → 型安全性保証
</div>

---

## Challenge 4: MCP Protocol Integration

<div class="challenge">
HTTP API を MCP Tools として AI エージェントに公開する必要がある
</div>

### 🚫 **Problem**
- MCP ツール定義の複雑さ
- パラメータのスキーマ化

---

## Solution: 自動 MCP Tools 生成

### ✅ **OpenAPI → MCP Tools 変換**

```typescript
export const tdTools: Tool[] = [
  {
    name: "create_td_node",
    description: "Create a new TouchDesigner node",
    inputSchema: zodToJsonSchema(CreateTdNodeRequestSchema)
  },
  {
    name: "execute_python_script",
    description: "Execute arbitrary Python script",
    inputSchema: zodToJsonSchema(ExecutePythonScriptRequestSchema)
  }
  // ... 8 other tools
]
```

### 🎯 **ポイント**
- 自動スキーマ変換
- 10 Tools + 3 Prompts で完全制御

---

## The Result: 完全な通信パイプライン

### 📊 **System Architecture**

<div class="mermaid">
graph LR
    A[🤖 AI Agent<br/>Claude/GPT]
    B[🔌 MCP Server<br/>TypeScript]
    C[🌐 WebServer DAT<br/>Python]
    D[🎨 TouchDesigner<br/>Application]

    A -->|MCP Protocol<br/>Tool Calls| B
    B -->|HTTP API<br/>REST Calls| C
    C -->|Internal API<br/>Python Calls| D
    D -->|Response| C
    C -->|JSON Response| B
    B -->|MCP Response| A

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
</div>

### 🔄 **Communication Flow Example**

<div class="tech-stack">
  <div class="tech-item">
    <strong>1. Request</strong><br>
    <small>AI: "Create sphere"</small>
  </div>
  <div class="tech-item">
    <strong>2. MCP Call</strong><br>
    <small>create_td_node(...)</small>
  </div>
  <div class="tech-item">
    <strong>3. HTTP POST</strong><br>
    <small>/nodes endpoint</small>
  </div>
  <div class="tech-item">
    <strong>4. Python Execute</strong><br>
    <small>op('/').create(...)</small>
  </div>
  <div class="tech-item">
    <strong>5. Response</strong><br>
    <small>"Created sphere1"</small>
  </div>
</div>

<div class="solution">
「APIがない」アプリケーションに完全な外部制御を実現！
</div>

---

## 開発体験の向上

### 🔄 **自動化されたワークフロー**
```bash
npm run gen              # 全コード生成
npm run gen:webserver    # Python Flask API 生成
npm run gen:handlers     # Python ハンドラー生成
npm run gen:mcp         # TypeScript クライアント生成
```

### 🐳 **Docker 環境**
Java Runtime + Node.js + TouchDesigner 連携

### 🔍 **デバッグ**
```bash
npm run dev  # MCP Inspector
```

---

## テスト戦略: 現実世界との統合

<div class="challenge">
単体テストだけでは「実際に動く」保証がない
</div>

### ✅ **Our Approach: 実機統合テスト**

```typescript
// tests/integration/touchdesigner.test.ts
describe("TouchDesigner Integration", () => {
  test("Full workflow: Create → Update → Delete", async () => {
    // 1. 実際の TouchDesigner でノード作成
    const createResult = await client.createTdNode({
      node_type: "sphere",
      parent_path: "/project1/test_base_comp"
    })
    expect(createResult.success).toBe(true)

    // 2. パラメータ更新
    const updateResult = await client.updateTdNodeParameters({
      node_path: createResult.data.node_path,
      parameters: { "scale": 2.0 }
    })
    expect(updateResult.success).toBe(true)

    // 3. ノード削除
    const deleteResult = await client.deleteTdNode({
      node_path: createResult.data.node_path
    })
    expect(deleteResult.success).toBe(true)
  })
})
```

**Key Point**: モックではなく **実際の TouchDesigner** でテスト

---

## 汎用的なパターンとしての価値

### 🔑 **適用可能な場面**

- **デスクトップアプリ**: Blender, Maya, After Effects
- **組み込みシステム**: Arduino, Raspberry Pi
- **レガシーシステム**: 古いCADソフト、制御システム

### 💡 **Key Pattern**
<div class="highlight">
内部機能 + Bridge + OpenAPI + MCP = AI制御可能
</div>

---

## 学んだ教訓

### ✅ **成功要因**
- 既存機能の創造的活用
- OpenAPI Schema First による型安全性
- 実機テスト重視

### ⚠️ **注意点**
- 制約の理解が最重要
- 実機テストなしには品質保証不可能

---

# まとめ

## 🎯 **「APIがない」は「不可能」ではない**

<div class="solution">
創造的なアプローチで新しい可能性を切り開ける
</div>

### 証明したこと
1. WebServer DAT による HTTP API 実現
2. OpenAPI 駆動による型安全な多言語連携
3. MCP Protocol による AI エージェント対応

### Repository & Article
- **GitHub**: https://github.com/8beeeaaat/touchdesigner-mcp
- **Article**: https://zenn.dev/8beeeaaat/articles/c7651e8a1dd937

**Questions?** 🙋‍♂️

---
