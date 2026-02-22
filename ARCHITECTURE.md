# ARCHITECTURE.md

## 1. 構成概要

- Framework: Next.js (App Router)
- Language: TypeScript
- UI: Tailwind CSS v4 + shadcn/ui + AI Elements
- ORM/DB: Drizzle ORM + libsql (Turso)
- API: Route Handlers (`app/api/**`)
- Data Mode: live only（外部API取得）
- Deploy target: Vercel / Cloudflare

## 2. レイヤー構成

- `app/`: 画面とAPIエンドポイント
- `components/`: AI Elementsを含む表示部品
- `lib/samples/`: 初期表示用サンプルデータ
- `lib/connectors/`: 外部API接続（GitHub/Arbeitnow/SEC/GDELT/Wikidata）
- `lib/db/`: セッション保存用リポジトリ
- `lib/env.ts`: 環境変数解決
- `types/`: ドメイン型

## 3. エンドポイント

- `POST /api/chat`
  - AI SDK `streamText` を利用（OpenAI / Gemini）
- `GET /api/connectors/sales-account`
- `GET /api/connectors/recruiting-market`
- `GET /api/connectors/research-signal`
- `POST /api/voice/tts`
- `POST /api/voice/transcribe`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/[id]`

## 4. 状態戦略

- 画面状態: `DemoWorkspace` 内で Queue/Plan/Task/Artifacts を保持
- 復元: Checkpoint と Session API でスナップショット復元
- 永続化: Drizzle + libsql

## 5. 設計原則

- live取得が失敗した場合は原因と再実行手順を明示する
- 外部反映を伴う操作は Confirmation を必須化する
- connector を UI から分離し、API変更影響を局所化する
- ユーザーが最初に触る導線（Run Scenario→Conversation→Approval）を優先する
