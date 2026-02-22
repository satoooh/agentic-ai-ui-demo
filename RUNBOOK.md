# RUNBOOK.md

## 1. 初期起動

```bash
cp .env.example .env.local
npm install
npm run dev
```

- 開発サーバー: `http://localhost:3000`（ポート競合時は自動変更）

## 2. 環境変数

- `OPENAI_API_KEY` / `OPENAI_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_MODEL`
- `GITHUB_TOKEN`（任意。GitHub APIレート上限対策）
- `SEC_USER_AGENT`（任意。SEC/GDELT/Wikidataアクセス時の識別子）
- `DATABASE_URL`（Drizzle/libsql接続先）
- `DATABASE_AUTH_TOKEN`（Turso利用時）

## 3. 運用ルール

- すべての会話処理は LLM 実行前提で運用する
- 送信/オファー/配布など副作用操作は承認必須
- 失敗時は原因と次アクションを画面に返す
- 永続化は Drizzle + libsql(Turso) 方針を優先

## 4. 検証手順

```bash
npm run lint
npm run typecheck
npm run build
```

- `/sales` `/recruiting` `/research` を巡回し、
  - 入力
  - 進捗
  - 成果物
  - 承認
  の4ブロックが表示されることを確認
- 各画面で `1-click Demo Scenario` を実行し、最終ステップまで `done` になることを確認
- 各接続パネルで `refresh` を実行し、live取得結果とエラー表示の両方を確認

## 5. ステータス記録テンプレ

- 日付:
- 完了:
- 進行中:
- ブロッカー:
- リスク更新:
- 次の1手:
- 追加/活用した AI Elements:
