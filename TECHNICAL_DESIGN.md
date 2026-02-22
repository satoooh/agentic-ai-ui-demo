# TECHNICAL_DESIGN.md

## 1. ディレクトリ

```text
app/
  (demos)/
    sales/page.tsx
    recruiting/page.tsx
    research/page.tsx
  settings/page.tsx
  api/chat/route.ts
  api/connectors/{sales-account,recruiting-market,research-signal}/route.ts
  api/sessions/route.ts
  api/sessions/[id]/route.ts
  api/voice/{tts,transcribe}/route.ts
components/
  common/
    site-nav.tsx
    section-card.tsx
  demos/
    demo-workspace.tsx
    demo-script-panel.tsx
    sales-source-panel.tsx
    recruiting-source-panel.tsx
    research-source-panel.tsx
    workflow-editor.tsx
    code-lab-panel.tsx
lib/
  env.ts
  db/{client,schema,repository}.ts
  connectors/
  samples/
types/
  demo.ts
  chat.ts
```

## 2. データモデル（主要）

- `SalesAccountInsight`
- `SalesOutreachDraft`
- `RecruitingJobPosting`
- `CandidateBrief`
- `ResearchSignal`
- `Evidence`
- `GeneratedConnectorProject`
- `WorkflowGraph`

## 3. API契約（現行）

- chat: `{ messages?, demo, provider, model, approved? }`
- tts: `{ text, voice? }`
- connectors:
  - `/api/connectors/sales-account?org=`
  - `/api/connectors/recruiting-market?query=`
  - `/api/connectors/research-signal?query=`
- sessions:
  - `POST /api/sessions` で現在状態を保存
  - `GET /api/sessions?demo=...` で一覧
  - `GET /api/sessions/:id` で復元

## 4. 承認フロー設計

- `/api/chat` が承認対象操作で `approval.required=true` を返す
- UI は Confirmation モーダルで停止・承認を実施
- 承認後に `approved: true` で再送して処理を継続

## 5. 拡張ポイント

- `lib/connectors/*.ts`
  - 企業CRM/ATS/Notionなど社内APIの追加接続
- `lib/db/*.ts`
  - セッション検索条件や監査ログ保存の拡張
- `app/api/voice/*`
  - STT/TTSプロバイダ実装への置換
- `MessageRenderer`（将来）
  - UIMessage parts と AI Elements の対応を明確化
