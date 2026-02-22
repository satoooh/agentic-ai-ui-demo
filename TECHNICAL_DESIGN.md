# TECHNICAL_DESIGN.md

## 1. ディレクトリ

```text
app/
  (demos)/
    construction/page.tsx
    transport/page.tsx
    gov-insight/page.tsx
  settings/page.tsx
  api/chat/route.ts
  api/connectors/{odpt,estat,egov}/route.ts
  api/sessions/route.ts
  api/sessions/[id]/route.ts
  api/voice/{tts,transcribe}/route.ts
components/
  common/
    site-nav.tsx
    section-card.tsx
  demos/
    demo-workspace.tsx
    workflow-editor.tsx
    code-lab-panel.tsx
lib/
  env.ts
  db/{client,schema}.ts
  connectors/
  mock/
types/
  demo.ts
  chat.ts
```

## 2. データモデル（主要）

- `DailyReportDraft`
- `PhotoLedgerItem`
- `WorkflowGraph`
- `OperationEvent`
- `AnnouncementDraft`
- `DatasetCandidate`
- `StatSeries`
- `Evidence`
- `GeneratedConnectorProject`

## 3. API契約（現行）

- chat: `{ messages?, demo, provider, model, approved? }`
- tts: `{ text, voice? }`
- connectors: GETで `mode` と `note` を含む
- sessions:
  - `POST /api/sessions` で現在状態を保存
  - `GET /api/sessions?demo=...` で一覧
  - `GET /api/sessions/:id` で復元

## 4. 承認フロー設計

- mock段階では `/api/chat` が `requiresApproval=true` を返す
- UI側は Confirmation コンポーネントにこの値を接続
- live段階では tool approval（2段階）へ移行

## 5. 拡張ポイント

- `lib/connectors/*.ts`
  - ODPT/e-Stat/e-Gov の live 実装
- `lib/db/*.ts`
  - DemoSession / Artifact 永続化を Drizzle + libsql で実装
- `app/api/voice/*`
  - STT/TTS プロバイダ置換
- `MessageRenderer`（未実装）
  - UIMessage parts と AI Elements の対応付け
