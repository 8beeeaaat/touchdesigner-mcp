# Streamable HTTP Transport Implementation Plan (SDK-First Redesign)

**Status**: Ready for Implementation
**Approach**: Maximize MCP SDK Usage, Minimize Custom Code
**Last Updated**: 2025-12-06

## エグゼクティブサマリー

MCP SDK 1.24.3の詳細な調査により、当初の実装計画はSDKの組み込み機能を十分に活用しておらず、約700行の冗長なカスタムコードが含まれていることが判明しました。

### 主要な発見

- **SDK提供機能**: `createMcpExpressApp()`, `hostHeaderValidation()` ミドルウェア、組み込みセッション検証
- **重複コード**: DNS保護、HTTPルーティング、セッション検証が全てSDKと重複
- **廃止予定API**: `allowedHosts`, `allowedOrigins`, `enableDnsRebindingProtection` パラメータを使用

### 再設計の成果

- **コード削減**: 約700行（46%削減）
- **SDK活用度**: 30% → 80%
- **保守性向上**: 標準実装への移行により長期的な保守が容易に

---

## アーキテクチャ比較

### 旧設計（問題あり - 実装しない）

```
CLI → HttpTransportManager → HttpServerManager (Node.js http)
         ↓                         ↓
    SessionManager            Custom Routing
         ↓                    (POST/GET/DELETE)
    SecurityPolicy                 ↓
    (DNS Rebinding)          StreamableHTTPServerTransport
                             + Duplicate Session Validation
```

**問題点**:

- 3層のカスタムHTTP管理（Manager, ServerManager, SecurityPolicy）
- SDKが既に処理する機能を重複実装（700行の冗長コード）
- 廃止予定のSDK APIを使用

### 新設計（SDK-First - 実装する）

```
CLI → ExpressHttpManager → Express App (SDK createMcpExpressApp)
         ↓                       ↓
    SessionManager         hostHeaderValidation() [SDK Middleware]
    (TTL Cleanup)                ↓
         ↓                  /mcp → StreamableHTTPServerTransport.handleRequest()
    Server Lifecycle        /health → Custom Handler
    (Graceful Shutdown)
```

**改善点**:

- 1層のシンプルなHTTP管理（ExpressHttpManager）
- SDKミドルウェアで標準機能を活用
- カスタムコードはTTLとライフサイクルのみ（150行）

---

## 実装計画

### Phase 1: Express統合とSDKミドルウェア（1-2日）

#### 1.1 新規作成: `src/transport/expressHttpManager.ts`

**責務**:

- Express app作成（SDK's `createMcpExpressApp`）
- `/mcp` endpoint → `transport.handleRequest()` への委譲
- `/health` endpoint → カスタムハンドラ
- SessionManager統合（TTLクリーンアップ）
- Graceful shutdown処理

**削減されるファイル**:

- ❌ `src/transport/httpServerManager.ts` (290行) - 削除
- ❌ `src/transport/httpTransportManager.ts` (420行) - 削除
- ❌ `src/transport/security.ts` (209行) - 削除

**合計**: 約700行 → 150行に置き換え

#### 1.2 更新: `src/transport/factory.ts`

廃止予定のSDK optionsを削除し、シンプルなsession管理のみに特化。

#### 1.3 更新: `src/transport/sessionManager.ts`

- `validate()` メソッド削除 → SDKが`handleRequest()`内で検証
- `checkTTL()` 追加 - TTLチェックのみに特化

#### 1.4 更新: `src/transport/config.ts`

- `SecurityConfig` interface削除
- `allowedHosts` をトップレベルに移動

---

### Phase 2: CLI統合とTransport Lifecycle（1日）

#### 2.1 更新: `src/cli.ts`

**重要な変更**:

1. Multiple transport instances → Single transport instance
2. `server.connect(transport)` を明示的に呼び出し
3. Graceful shutdownで`transport.close()`を追加

---

### Phase 3: 設定とバリデーション（0.5日）

#### 3.1 更新: `src/transport/validator.ts`

- SecurityConfig検証削除

#### 3.2 更新: `src/transport/index.ts`

- エクスポート更新

---

### Phase 4: テストとドキュメント（1日）

#### 4.1 新規作成

- `tests/unit/transport/expressHttpManager.test.ts`
- `docs/sdk-migration.md`

#### 4.2 削除

- `tests/unit/transport/httpServerManager.test.ts`
- `tests/unit/transport/httpTransportManager.test.ts`
- `tests/unit/transport/security.test.ts`

---

## ファイル変更サマリー

### 削除（約700行）

- ❌ `src/transport/httpServerManager.ts`
- ❌ `src/transport/httpTransportManager.ts`
- ❌ `src/transport/security.ts`

### 新規作成

- ✅ `src/transport/expressHttpManager.ts` (~150行)
- ✅ `docs/sdk-migration.md`

### 大幅更新

- 🔧 `src/cli.ts`
- 🔧 `src/transport/factory.ts`
- 🔧 `src/transport/sessionManager.ts`
- 🔧 `src/transport/config.ts`

---

## SDK機能の活用

### SDKに完全委譲（Custom Code削除）

| 機能                | SDK機能                       | 削減行数 |
| ------------------- | ----------------------------- | -------- |
| DNS Rebinding保護   | createMcpExpressApp()         | ~100行   |
| HTTP routing        | handleRequest()               | ~200行   |
| Session validation  | StreamableHTTPServerTransport | ~100行   |
| POST/GET/DELETE処理 | SDK built-in                  | ~150行   |

**合計**: 約600行をSDK標準機能に置き換え

### カスタム実装を保持

| 機能              | 理由               |
| ----------------- | ------------------ |
| TTL-based cleanup | SDKは提供しない    |
| /health endpoint  | アプリ固有         |
| Graceful shutdown | ライフサイクル管理 |

---

## 成功基準

### 機能面

- ✅ 全testsがpass
- ✅ DNS rebinding保護動作（SDK middleware）
- ✅ Session TTL cleanup動作
- ✅ Graceful shutdown動作（transport.close()）
- ✅ stdio modeに影響なし

### 非機能面

- ✅ コード46%削減
- ✅ SDK利用80%達成
- ✅ 廃止予定API使用ゼロ

---

## 実装順序

```
Phase 1 (1-2日)
├─ expressHttpManager.ts 作成
├─ factory.ts 更新
├─ sessionManager.ts 更新
└─ config.ts 更新

Phase 2 (1日)
├─ cli.ts 更新
└─ 古いファイル削除

Phase 3 (0.5日)
├─ validator.ts 更新
└─ index.ts 更新

Phase 4 (1日)
├─ テスト作成
└─ ドキュメント作成
```

**Total**: 3-4日

---

## Critical Files

1. `src/transport/expressHttpManager.ts` (新規・150行)
2. `src/cli.ts` (大幅更新)
3. `src/transport/factory.ts` (更新)
4. `src/transport/sessionManager.ts` (更新)
5. `src/transport/config.ts` (更新)

---

## 参考資料

### MCP SDK

- [SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [Express Integration](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/server/express.ts)

**Document Version**: 3.0 (SDK-First Redesign)
**Status**: Ready for Implementation
