# ARCHITECTURE.md

## 1. 構成概要

- Framework: Next.js (App Router)
- Language: TypeScript
- UI: Tailwind CSS v4 + daisyUI
- ORM/DB: Drizzle ORM + libsql (Turso)
- API: Route Handlers (`app/api/**`)
- Data Mode: `DEMO_MODE=mock|live`
- Deploy target: Vercel / Cloudflare

## 2. レイヤー構成

- `app/`: 画面とAPIエンドポイント
- `components/`: 表示部品
- `lib/mock/`: モックデータ
- `lib/connectors/`: 外部API接続層
- `lib/env.ts`: 環境変数解決
- `types/`: ドメイン型

## 3. エンドポイント

- `POST /api/chat`
  - mock: 承認要求を含む固定レスポンス
  - live: AI SDK `streamText` を利用（OpenAI / Gemini 切替）
- `GET /api/connectors/odpt`
- `GET /api/connectors/estat`
- `GET /api/connectors/egov`
- `POST /api/voice/tts`
- `POST /api/voice/transcribe`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/[id]`

## 4. 状態戦略

- 現状: ページ内の静的状態 + APIレスポンス
- 次段階:
  - DemoSession（localStorage）
  - Checkpoint（メッセージインデックス）
  - ArtifactShelf（成果物一覧）

## 5. 設計原則

- liveが失敗してもmockで継続
- 副作用操作は承認フローを必須化
- コネクタ実装はUIから分離し差し替え可能にする
- 永続化は `Drizzle + libsql(Turso)` を第一候補にする（現段階は雛形のみ）
- このリポジトリは Next.js App Router 前提のため React Router v7 は採用しない
