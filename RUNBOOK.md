# RUNBOOK.md

## 1. 初期起動

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 2. 環境変数

- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_MODEL`
- `SEC_USER_AGENT`（任意）
- `DATABASE_URL` / `DATABASE_AUTH_TOKEN`

## 3. 運用ルール

- チャット処理は LLM 実行前提
- 根拠提示は `Sources` / `InlineCitation` を優先
- 送信キーは `Cmd/Ctrl+Enter` を利用
- 詳細モードUIは使わず、シンプル導線で運用

## 4. 検証手順

```bash
npm run lint
npm run typecheck
```

- `/meeting`
  - Step 1 で議事録を入力し確定できる
  - 確定後、チャットと右TL;DRが2カラムで表示される
- `/research`
  - 目的入力から根拠付き回答が表示される
  - 右TL;DRに最新要約が反映される

## 5. ステータス記録テンプレ

- 日付:
- 完了:
- 進行中:
- ブロッカー:
- リスク更新:
- 次の1手:
- 追加/活用した AI Elements:
