# RUNBOOK.md

## 1. 初期起動

```bash
cp .env.example .env.local
npm install
npm run dev
```

- 開発サーバー: `http://localhost:3000`（ポート競合時は自動変更）

## 2. 環境変数

- `DEMO_MODE=mock|live`
- `OPENAI_API_KEY`（live chat時）
- `OPENAI_MODEL`
- `GOOGLE_GENERATIVE_AI_API_KEY`（Gemini live chat時）
- `GEMINI_MODEL`
- `ODPT_TOKEN`（公共交通 live時）
- `ESTAT_APP_ID`（官公庁データ live時）
- `DATABASE_URL`（Drizzle/libsql接続先）
- `DATABASE_AUTH_TOKEN`（Turso利用時）

## 3. 運用ルール

- live未設定時は必ずmockへフォールバック
- 公開/提出/配布のような副作用は承認必須
- 失敗時は原因を表示し、次の手順を返す
- 永続化は Drizzle + libsql(Turso) 方針を優先

## 4. 検証手順

```bash
npm run lint
npm run typecheck
npm run build
```

- `/construction` `/transport` `/gov-insight` を巡回し、
  - 入力
  - 進捗
  - 成果物
  - 承認
  の4ブロックが表示されることを確認
- 各画面で `1-click Demo Scenario` を実行し、最終ステップまで `done` になることを確認
- `/transport` と `/gov-insight` の接続パネルで `mode: mock/live` を切り替えて `refresh` し、フォールバック表示を確認

## 5. ステータス記録テンプレ

- 日付:
- 完了:
- 進行中:
- ブロッカー:
- リスク更新:
- 次の1手:
- 追加/活用した AI Elements:
