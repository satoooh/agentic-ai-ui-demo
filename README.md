# Japan Vertical Agentic Demo Lab

建設 / 公共交通 / 官公庁データ活用の3領域を対象に、AI ElementsベースのエージェンティックUIを実装するための土台プロジェクトです。

## セットアップ

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 技術スタック（現時点）

- Core: Next.js 16 / TypeScript / React 19
- UI: Tailwind CSS v4 + daisyUI
- AI: AI SDK (`ai`, `@ai-sdk/openai`)
- LLM Providers: OpenAI / Gemini
- Data: Drizzle ORM + libsql (`@libsql/client`) + Turso 想定
- Deploy: Vercel / Cloudflare を想定

`React Router v7` は Next.js App Router と排他的なため、このリポジトリでは採用していません。

## 主要ルート

- `/` : 3デモの概要
- `/construction` : 建設デモ
- `/transport` : 公共交通デモ
- `/gov-insight` : 官公庁データ活用デモ
- `/settings` : 環境変数状態

## デモ強化ポイント

- 各デモに `1-click Demo Scenario` を実装（入力→進捗→成果物→承認を自動再現）
- `Approval Ledger` で承認履歴を監査ログとして表示
- `Input to Approval` ゲートで業務フロー達成状況を可視化
- 各デモに `1-minute Demo Script` を常設（営業/社内説明向け）

## API雛形

- `POST /api/chat` : mock/live 切替可能な会話エンドポイント
- `GET /api/connectors/odpt` : 公共交通データ（`?mode=mock|live` でオーバーライド可）
- `GET /api/connectors/estat` : e-Statデータ（`?mode=mock|live` でオーバーライド可）
- `GET /api/connectors/egov` : e-Gov候補データ（`?mode=mock|live` でオーバーライド可）
- `POST /api/voice/tts` : 音声生成モック
- `POST /api/voice/transcribe` : 文字起こしモック

## ドキュメント（5点）

- `SPEC.md`
- `PLAN.md`
- `ARCHITECTURE.md`
- `TECHNICAL_DESIGN.md`
- `RUNBOOK.md`

## 注意点

- `DEMO_MODE=mock` ならAPIキーなしでも通し体験が可能です。
- `live` 接続は各 `lib/connectors/*.ts` を段階拡張する前提の雛形です。
- 既定モデルは `OPENAI_MODEL=gpt-5.1`, `GEMINI_MODEL=gemini-2.5-flash` です。
