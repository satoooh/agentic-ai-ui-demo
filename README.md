# Japan Vertical Agentic Demo Lab

会議レビュー（悪魔の代弁者）を中心に、営業・採用・企業調査へ展開できるAI Elementsベースのデモプロジェクトです。  
狙いは「モデル性能の誇示」ではなく、`会議ログ入力 → 反証 → 修正 → 次アクション` の自律ループを短時間で伝えることです。

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
- `/meeting` : 会議レビュー特化デモ（会議タイプ設定・反証・次アクション）
- `/sales` : 営業デモ（提案生成・反証・次ループ）
- `/recruiting` : 採用デモ（候補者評価・懸念検証・再探索）
- `/research` : 企業調査デモ（IR収集・公開情報分析・次探索）
- `/settings` : 環境変数状態

## デモの見どころ

- 会議レビュー: 会議タイプ設定→議事録入力→悪魔の代弁者→次アクション
- 営業: アカウント調査→提案骨子→反証探索→次アクション
- 採用: 候補者要約→面接設計→懸念シミュレーション→次探索
- 企業調査: SEC/GDELT/Wikidata収集→根拠付き分析→次探索

会議レビューデモでは、会議タイプ（営業週次/採用進捗/プロダクト計画/経営レビュー）ごとに  
主要論点・出力テンプレート・Run Scenario が自動で切り替わります。

全デモで `Run Scenario` を起点に、`自律ループ実行` と `悪魔の代弁者` を1クリックで再現できます。

## APIエンドポイント

- `POST /api/chat` : mock/live切替可能な会話エンドポイント
- `GET /api/connectors/sales-account` : GitHub組織情報（`mode`, `org`）
- `GET /api/connectors/recruiting-market` : 採用市況ジョブシグナル（`mode`, `query`）
- `GET /api/connectors/meeting-signal` : 会議レビュー向け公開シグナル（HN, `mode`, `query`）
- `GET /api/connectors/research-signal` : SEC + GDELT + Wikidataの企業調査シグナル（`mode`, `query`）
- `POST /api/voice/tts` : 音声生成モック
- `POST /api/voice/transcribe` : 文字起こしモック
- `GET /api/runtime` : サーバー側の `DEMO_MODE` とAPIキー設定有無
- `GET /api/sessions` / `POST /api/sessions` / `GET /api/sessions/[id]` : セッション保存・復元

## 環境変数

- `DEMO_MODE=mock|live`
- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_MODEL`
- `GITHUB_TOKEN`（任意、GitHub APIレート上限対策）
- `SEC_USER_AGENT`（任意、SEC/GDELT/Wikidata呼び出し時に使用）
- `DATABASE_URL` / `DATABASE_AUTH_TOKEN`

各デモ画面の `Model & Context` で `chat mode: live` を選ぶと、`DEMO_MODE=mock` でも live 推論を個別に試せます。  
同パネルの `Runtime` に、サーバーが認識しているキー設定状態を表示します。

## 参照ドキュメント

- `SPEC.md`
- `PLAN.md`
- `ARCHITECTURE.md`
- `TECHNICAL_DESIGN.md`
- `RUNBOOK.md`
