# ARCHITECTURE.md

## 1. 構成概要

- Framework: Next.js (App Router)
- Language: TypeScript
- UI: Tailwind CSS v4 + shadcn/ui + AI Elements
- AI: AI SDK（OpenAI / Gemini）
- DB: Drizzle ORM + libsql（Turso想定）

## 2. 画面構成

- `/` : デモ一覧（会議レビューAI / 企業調査AI）
- `/meeting` : 議事録入力 → チャットレビュー
- `/research` : 調査目的入力 → チャット調査
- `/settings` : 環境変数状態

## 3. 主なコンポーネント責務

- `components/common/site-nav.tsx`
  - 左タイトルのみのシンプルヘッダー
- `components/demos/demo-workspace.tsx`
  - 会議/企業調査の共通ワークスペース
  - `Reasoning`, `PromptInput`, `Sources`, `Suggestion`, `Queue`, `InlineCitation` の統合

## 4. APIエンドポイント

- `POST /api/chat`
- `GET /api/connectors/meeting-signal`
- `GET /api/connectors/research-signal`
- `POST /api/voice/tts`
- `POST /api/voice/transcribe`
- `GET/POST /api/sessions`, `GET /api/sessions/[id]`

## 5. 状態戦略

- チャット状態: `useChat`
- ローカルUI状態: `DemoWorkspace` 内で管理
- 永続化: Session API + Drizzle/libsql
