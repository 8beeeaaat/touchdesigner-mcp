# Phase 8: 残タスク実装ガイド

**ステータス**: Ready for Implementation
**最終更新**: 2025-12-06
**前提**: Phase 1-7 完了済み（コア実装完了）

---

## エグゼクティブサマリー

HTTP Transport実装のPhase 1-7（コア機能）は完了しました。Phase 8として、以下の4つのカテゴリーの残作業を完了させます：

1. **開発スクリプト追加** - HTTPモード開発の利便性向上
2. **単体テスト追加** - ExpressHttpManagerのテストカバレッジ
3. **統合テスト追加** - HTTP Transportの実動作確認
4. **ドキュメント整備** - ユーザー向け使用方法の説明

**所要時間**: 約2-3時間（オプション含めて3-5時間）

---

## 実装済み確認

### ✅ 完了済みのPhase（Phase 1-7）

| Phase | 内容 | ファイル |
|-------|------|---------|
| Phase 1 | 基盤整備 | `src/transport/config.ts`, `validator.ts` |
| Phase 2 | Transport Factory | `src/transport/factory.ts` |
| Phase 3 | HTTP Server Management | `src/transport/expressHttpManager.ts` |
| Phase 4 | Session Management | `src/transport/sessionManager.ts` |
| Phase 5 | Security | SDK委譲（カスタムコード削除） |
| Phase 6 | Integration | TransportとSessionの連携 |
| Phase 7 | CLI & Server | `src/cli.ts` 更新 |

### ✅ 完了済みのテスト

- `tests/unit/transport/factory.test.ts` (9 tests)
- `tests/unit/transport/sessionManager.test.ts` (50+ tests)
- `tests/unit/transport/config.test.ts` (20+ tests)
- `tests/unit/transport/validator.test.ts` (19 tests)
- `tests/unit/cli.test.ts` (HTTP transport対応追加済み)

---

## 残タスク詳細

## タスク1: 開発スクリプト追加

### 目的

開発者がHTTPモードを簡単に試せるようにする

### 実装内容

**ファイル**: `package.json`

**追加するスクリプト**:

```json
{
  "scripts": {
    "http": "npm run build && node dist/cli.js --mcp-http-port=3000 --mcp-http-host=127.0.0.1 --host=http://127.0.0.1 --port=9981",
  }
}
```

### 使用例

```bash
# HTTPモードで起動（TouchDesigner WebServerに接続）
npm run http
```

### 検証方法

```bash
npm run http
# 別ターミナルで:
curl http://localhost:3000/health
# 期待: {"status":"healthy","sessions":0}
```

**所要時間**: 5分

---

## タスク2: ExpressHttpManager単体テスト作成

### 目的

ExpressHttpManagerの動作保証とリグレッション防止

### 実装内容

**新規ファイル**: `tests/unit/transport/expressHttpManager.test.ts`

**テスト項目**:

1. **HTTPサーバー起動・停止**
   - `start()` メソッドの成功確認
   - `stop()` メソッドのグレースフルシャットダウン
   - サーバーステータス取得

2. **/health エンドポイント**
   - GETリクエストで `{"status":"healthy"}` を返す
   - アクティブセッション数の表示

3. **エラーハンドリング**
   - ポート衝突時のエラー
   - 二重起動の防止

4. **セッション連携**
   - SessionManagerとの統合確認
   - シャットダウン時のセッションクリーンアップ

### テストコード構造

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExpressHttpManager } from '../../../src/transport/expressHttpManager.js';
import { SessionManager } from '../../../src/transport/sessionManager.js';
import type { StreamableHttpTransportConfig } from '../../../src/transport/config.js';

describe('ExpressHttpManager', () => {
  let manager: ExpressHttpManager;
  let sessionManager: SessionManager;
  let config: StreamableHttpTransportConfig;

  beforeEach(() => {
    // Setup test configuration
    config = {
      type: 'streamable-http',
      port: 3001, // テスト用ポート
      host: '127.0.0.1',
      endpoint: '/mcp',
      sessionConfig: { enabled: true, ttl: 60000 }
    };

    sessionManager = new SessionManager(
      config.sessionConfig,
      mockLogger
    );
  });

  afterEach(async () => {
    if (manager) {
      await manager.stop();
    }
  });

  describe('Server Lifecycle', () => {
    it('should start HTTP server successfully', async () => {
      // Test implementation
    });

    it('should stop HTTP server gracefully', async () => {
      // Test implementation
    });

    it('should return server status', () => {
      // Test implementation
    });

    it('should prevent double start', async () => {
      // Test implementation
    });
  });

  describe('/health Endpoint', () => {
    it('should return healthy status', async () => {
      // Test implementation using fetch
    });

    it('should include active session count', async () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    it('should handle port conflicts', async () => {
      // Test implementation
    });
  });

  describe('Session Integration', () => {
    it('should cleanup sessions on shutdown', async () => {
      // Test implementation
    });
  });
});
```

### 参考実装

- `tests/unit/transport/sessionManager.test.ts` - テストパターン
- `src/transport/expressHttpManager.ts` - 実装詳細

**所要時間**: 30分

---

## タスク3: HTTP Transport統合テスト作成

### 目的

実際のHTTPリクエストでMCPプロトコルの動作を確認

### 実装内容

**新規ファイル**: `tests/integration/httpTransport.test.ts`

**テスト項目**:

1. **初期化リクエスト**
   - POST /mcp with `initialize` method
   - セッションID発行確認（`mcp-session-id` ヘッダー）
   - 正しいレスポンス形式（JSON-RPC 2.0）

2. **tools/list リクエスト**
   - セッションID付きリクエスト
   - ツールリストの取得確認

3. **セッション検証**
   - セッションIDなしリクエストの拒否（400 Bad Request）
   - 無効なセッションIDの拒否

4. **/health エンドポイント**
   - 200 OK レスポンス
   - JSONフォーマット確認

5. **グレースフルシャットダウン**
   - アクティブリクエスト中のシャットダウン
   - セッションクリーンアップ

### テストコード構造

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TouchDesignerServer } from '../../src/server/touchDesignerServer.js';
import { TransportFactory } from '../../src/transport/factory.js';
import type { StreamableHttpTransportConfig } from '../../src/transport/config.js';

describe('HTTP Transport Integration', () => {
  let server: TouchDesignerServer;
  const testPort = 3002; // 他のテストと衝突しないポート
  const baseUrl = `http://127.0.0.1:${testPort}`;

  beforeAll(async () => {
    // Setup TouchDesigner WebServer mock
    process.env.TD_WEB_SERVER_HOST = 'http://127.0.0.1';
    process.env.TD_WEB_SERVER_PORT = '9981';

    const config: StreamableHttpTransportConfig = {
      type: 'streamable-http',
      port: testPort,
      host: '127.0.0.1',
      endpoint: '/mcp',
      sessionConfig: { enabled: true }
    };

    const transportResult = TransportFactory.create(config);
    expect(transportResult.success).toBe(true);

    server = new TouchDesignerServer();
    await server.connect(transportResult.data);
  });

  afterAll(async () => {
    await server.disconnect();
  });

  describe('MCP Protocol', () => {
    it('should handle initialize request', async () => {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {}
          },
          id: 1
        })
      });

      expect(response.status).toBe(200);
      const sessionId = response.headers.get('mcp-session-id');
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should handle tools/list request', async () => {
      // First initialize to get session ID
      const initResponse = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {},
          id: 1
        })
      });
      const sessionId = initResponse.headers.get('mcp-session-id');

      // Then call tools/list
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': sessionId!
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.result.tools).toBeInstanceOf(Array);
    });

    it('should reject request without session ID', async () => {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('/health Endpoint', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('sessions');
    });
  });
});
```

### モック戦略

既存の統合テストパターンを踏襲：

- TouchDesigner WebServerはモック化（既存の`touchDesignerClientAndWebServer.test.ts`参照）
- 実際のHTTP通信は行う（fetch使用）
- テスト用ポート3002を使用

**所要時間**: 1時間

---

## タスク4: ドキュメント整備

### 4.1 README.md更新

**目的**: ユーザーがHTTPモードを使い始められるようにする

**追加セクション**: "HTTP Transport Mode"

**挿入位置**: `## Installation` セクションの後

**内容**:

```markdown
## HTTP Transport Mode

TouchDesigner MCP Server supports HTTP transport for remote clients and web-based integrations.

### Starting in HTTP Mode

```bash
touchdesigner-mcp-server \
  --mcp-http-port=3000 \
  --mcp-http-host=127.0.0.1 \
  --host=http://127.0.0.1 \
  --port=9981
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mcp-http-port` | HTTP server port (required for HTTP mode) | - |
| `--mcp-http-host` | Bind address | `127.0.0.1` |
| `--host` | TouchDesigner WebServer host | `http://127.0.0.1` |
| `--port` | TouchDesigner WebServer port | `9981` |

### Health Check Endpoint

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "sessions": 0
}
```

### Difference from Stdio Mode

| Feature | Stdio Mode | HTTP Mode |
|---------|-----------|-----------|
| Connection | Standard I/O | HTTP/SSE |
| Use Case | Local CLI | Remote clients, web apps |
| Session Management | Single connection | Multiple sessions |
| Port Required | No | Yes |

### Development

```bash
# Start in HTTP mode with inspector
npm run http
```

```

**所要時間**: 15分

---

### 4.2 README.ja.md更新

**目的**: 日本語ユーザー向けドキュメント

**追加セクション**: "HTTP Transport モード"

**内容**: README.mdの日本語翻訳

```markdown
## HTTP Transport モード

TouchDesigner MCP Serverは、リモートクライアントやWebベースの統合向けにHTTPトランスポートをサポートしています。

### HTTPモードでの起動

```bash
touchdesigner-mcp-server \
  --mcp-http-port=3000 \
  --mcp-http-host=127.0.0.1 \
  --host=http://127.0.0.1 \
  --port=9981
```

### 設定オプション

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--mcp-http-port` | HTTPサーバーポート（HTTPモード必須） | - |
| `--mcp-http-host` | バインドアドレス | `127.0.0.1` |
| `--host` | TouchDesigner WebServerホスト | `http://127.0.0.1` |
| `--port` | TouchDesigner WebServerポート | `9981` |

### ヘルスチェックエンドポイント

```bash
curl http://localhost:3000/health
```

レスポンス:

```json
{
  "status": "healthy",
  "sessions": 0
}
```

### stdioモードとの違い

| 機能 | stdioモード | HTTPモード |
|------|------------|-----------|
| 接続方式 | 標準入出力 | HTTP/SSE |
| 用途 | ローカルCLI | リモートクライアント、Webアプリ |
| セッション管理 | 単一接続 | 複数セッション |
| ポート要否 | 不要 | 必要 |

### 開発

```bash
# HTTPモードでインスペクター起動
npm run http
```

```

**所要時間**: 15分

---

### 4.3 CLAUDE.md更新

**目的**: 開発者向けコマンドリファレンス更新

**追加場所**: `## Development Commands` セクション内

**追加内容**:

```markdown
### HTTP Transport Mode
- `npm run http` - Start MCP server in HTTP mode with MCP Inspector

**HTTP Mode Configuration:**
- Default port: 3000
- Default host: 127.0.0.1
- Endpoint: /mcp
- Health check: /health

### Transport Architecture

The server supports multiple transports through a factory pattern:

**Core Components:**
- `src/transport/factory.ts` - Transport creation and validation
- `src/transport/expressHttpManager.ts` - HTTP server lifecycle management
- `src/transport/sessionManager.ts` - Session management with TTL cleanup
- `src/transport/config.ts` - Transport configuration types and validation

**Design Philosophy:**
- SDK-First: Maximize use of MCP SDK built-in features
- Clean Architecture: Clear separation of concerns
- Type Safety: Comprehensive Zod validation
- Extensibility: Easy to add new transport types (WebSocket, gRPC)

**Implementation Details:**
See `.doc/streamable-http-implementation-plan.md` and `.doc/refactor_sdk_first.md` for detailed architecture documentation.
```

**所要時間**: 10分

---

### 4.4 アーキテクチャドキュメント作成（オプション）

**新規ファイル**: `docs/architecture/transport-layer.md`

**目的**: 公式アーキテクチャドキュメントとして`.doc/`の内容を整理

**内容概要**:

```markdown
# Transport Layer Architecture

## Overview

TouchDesigner MCP Serverのトランスポート層は、複数のMCPトランスポートプロトコルをサポートするためのプラガブルアーキテクチャを提供します。

## Design Principles

1. **SDK-First Approach**: MCP SDKの組み込み機能を最大限活用
2. **Clean Architecture**: レイヤー分離と依存性逆転
3. **Type Safety**: Zod による実行時バリデーション
4. **Extensibility**: 新しいトランスポートの追加が容易

## Components

### TransportFactory
- 責務: 設定からトランスポートインスタンスを生成
- サポートトランスポート: stdio, streamable-http

### ExpressHttpManager
- 責務: HTTPサーバーのライフサイクル管理
- 機能:
  - Express app作成（SDK's createMcpExpressApp）
  - /mcp endpoint → transport.handleRequest()
  - /health endpoint → カスタムハンドラ
  - グレースフルシャットダウン

### SessionManager
- 責務: クライアントセッション管理
- 機能:
  - セッション作成（UUID v4）
  - TTLベース有効期限
  - 自動クリーンアップ

## Extension Guide

新しいトランスポートの追加方法については、`.doc/streamable-http-implementation-plan.md` を参照してください。

## SDK Integration

カスタムコード削減の経緯については、`.doc/refactor_sdk_first.md` を参照してください。
```

**注意**: `.doc/`の詳細ドキュメントと重複しないよう、簡潔な概要に留める

**所要時間**: 1時間（オプション）

---

### 4.5 SDK移行ガイド作成（オプション）

**新規ファイル**: `docs/sdk-migration.md`

**目的**: SDK-First設計への移行経緯と成果を記録

**内容**:

```markdown
# SDK-First Migration Guide

## Background

当初の実装計画では約700行のカスタムHTTP管理コードが含まれていましたが、MCP SDK 1.24.3の詳細調査により、多くの機能がSDKに組み込まれていることが判明しました。

## Migration Summary

### Before (旧設計)
- カスタムHTTP管理: 3層（HttpTransportManager, HttpServerManager, SecurityPolicy）
- コード量: 約700行
- SDK活用度: 30%

### After (新設計)
- シンプルなHTTP管理: 1層（ExpressHttpManager）
- コード量: 約150行
- SDK活用度: 80%

## Key Changes

### 1. DNS Rebinding Protection
- **Before**: カスタム SecurityPolicy クラス
- **After**: SDK's createMcpExpressApp() + hostHeaderValidation()

### 2. Session Validation
- **Before**: カスタム SessionManager.validate()
- **After**: SDK's StreamableHTTPServerTransport.handleRequest()

### 3. HTTP Routing
- **Before**: カスタム POST/GET/DELETE ハンドラ
- **After**: SDK's built-in routing

## Benefits

1. **保守性向上**: 標準実装への移行により長期的な保守が容易
2. **コード削減**: 46%削減（1500行 → 800行）
3. **バグリスク低減**: SDKの実績ある実装を活用
4. **将来性**: SDK更新の恩恵を自動的に受けられる

## Implementation Details

詳細は `.doc/refactor_sdk_first.md` を参照してください。
```

**所要時間**: 1時間（オプション）

---

## 実装チェックリスト

### 必須タスク

- [ ] **タスク1**: package.json スクリプト追加（5分）
  - [ ] `http` スクリプト追加
  - [ ] 動作確認（`npm run http`）

- [ ] **タスク2**: ExpressHttpManager単体テスト（30分）
  - [ ] テストファイル作成
  - [ ] サーバーライフサイクルテスト
  - [ ] /health エンドポイントテスト
  - [ ] エラーハンドリングテスト
  - [ ] 全テストpass確認

- [ ] **タスク3**: HTTP Transport統合テスト（1時間）
  - [ ] テストファイル作成
  - [ ] 初期化リクエストテスト
  - [ ] tools/list リクエストテスト
  - [ ] セッション検証テスト
  - [ ] /health エンドポイントテスト
  - [ ] 全テストpass確認

- [ ] **タスク4**: ドキュメント整備
  - [ ] README.md更新（15分）
  - [ ] README.ja.md更新（15分）
  - [ ] CLAUDE.md更新（10分）

### オプションタスク

- [ ] `docs/architecture/transport-layer.md` 作成（1時間）
- [ ] `docs/sdk-migration.md` 作成（1時間）

---

## 成功基準

### 機能面

- ✅ `npm run http` でHTTPモード起動成功
- ✅ `npm test` で全テストpass（unit + integration）
- ✅ stdio modeに影響なし（既存テスト全pass）

### ドキュメント面

- ✅ README.mdにHTTP transport使用方法が記載
- ✅ README.ja.mdに日本語説明が記載
- ✅ CLAUDE.mdに開発コマンドが記載
- ✅ 新規開発者がドキュメントだけで使い始められる

### テストカバレッジ

- ✅ ExpressHttpManager: 全メソッドテスト済み
- ✅ HTTP Transport: MCPプロトコル動作確認済み
- ✅ エラーケース網羅済み

---

## トラブルシューティング

### ポート衝突

**問題**: `npm run http` でポート3000が使用中

**解決**:

```bash
# ポート使用状況確認
lsof -i :3000

# 別のポートを指定
node dist/cli.js --mcp-http-port=3001 --mcp-http-host=127.0.0.1
```

### テスト失敗

**問題**: HTTPトランスポートテストが失敗

**確認事項**:

1. TouchDesigner WebServerモックが正しく設定されているか
2. テスト用ポート（3002）が空いているか
3. `npm run build` が実行済みか

**デバッグ**:

```bash
# ビルド確認
npm run build

# テストを個別実行
npx vitest run tests/integration/httpTransport.test.ts

# 詳細ログ
DEBUG=* npx vitest run tests/integration/httpTransport.test.ts
```

---

## 参考資料

### 実装計画書

- `.doc/streamable-http-implementation-plan.md` - Phase 1-8の詳細実装計画
- `.doc/refactor_sdk_first.md` - SDK-First設計への移行経緯

### MCP仕様

- [MCP Specification - Transports](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports)
- [Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#http-with-sse)

### MCP TypeScript SDK

- [SDK Repository](https://github.com/modelcontextprotocol/typescript-sdk)
- [Express Integration](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/server/express.ts)

---

**Document Version**: 1.0
**Status**: Ready for Implementation
**Next Review**: 実装完了後
