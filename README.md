# Agentic UI Demo

会議レビューAIと企業調査AIに特化した、AI Elementsベースのデモプロジェクトです。  
狙いは「モデル性能の誇示」ではなく、`入力 → 収集 → 要約/反証 → 次アクション` の実務導線を短時間で伝えることです。

## セットアップ

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 技術スタック

- Core: Next.js 16 / TypeScript / React 19
- UI: Tailwind CSS v4 + shadcn/ui + AI Elements
- AI: AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`)
- LLM Providers: OpenAI / Gemini
- Data: Drizzle ORM + libsql (`@libsql/client`) + Turso 想定
- Deploy: Vercel / Cloudflare 想定

`React Router v7` は Next.js App Router と排他的なため本リポジトリでは採用していません。

## 主要ルート

- `/` : デモ一覧とQuick Start
- `/meeting` : 会議レビューAI（議事録入力・反証レビュー・次アクション）
- `/research` : 企業調査AI（Gemini Web検索・根拠付き分析・次探索）
- `/settings` : 環境変数状態

## デモの見どころ

- 会議レビューAI: 議事録を確定後、チャット上で要約・反証レビュー・実行アクションを反復
- 企業調査AI: 目的入力から、公開情報/PDF根拠を使って分析と次探索提案を反復
- 共通: `Reasoning` / `Sources` / `InlineCitation` / `Suggestion` / `PromptInput` を中心に実装

## APIエンドポイント

- `POST /api/chat` : LLM推論会話エンドポイント
- `GET /api/connectors/meeting-signal` : 会議レビュー向け公開シグナル（HN, `query`）
- `GET /api/connectors/research-signal` : SEC + GDELT + Wikidataの企業調査シグナル（`query`）
- `POST /api/voice/tts` : 音声プレビュー用エンドポイント
- `POST /api/voice/transcribe` : 文字起こし入力検証用エンドポイント
- `GET /api/runtime` : APIキー設定有無
- `GET /api/sessions` / `POST /api/sessions` / `GET /api/sessions/[id]` : セッション保存・復元

## 環境変数

- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_MODEL`
- `GITHUB_TOKEN`（任意、GitHub APIレート上限対策）
- `SEC_USER_AGENT`（任意、SEC/GDELT/Wikidata呼び出し時に使用）
- `DATABASE_URL` / `DATABASE_AUTH_TOKEN`

各デモ画面の `Model & Context` で OpenAI / Gemini とモデルを選択できます。  
同パネルの `Runtime` に、サーバーが認識しているキー設定状態を表示します。

## 参照ドキュメント

- `SPEC.md`
- `PLAN.md`
- `ARCHITECTURE.md`
- `TECHNICAL_DESIGN.md`
- `RUNBOOK.md`
