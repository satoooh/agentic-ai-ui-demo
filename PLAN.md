# PLAN.md

## 1. マイルストーン

### M0: 共通基盤

- Next.js App Router + TypeScript
- Tailwind v4 + shadcn/ui + AI Elements
- `mock/live` 切替付き API 雛形
- OpenAI / Gemini モデル切替
- Sessions 保存（Drizzle + libsql）

### M1: 営業デモ

- GitHubアカウント情報連携（live/mock）
- 提案骨子生成と送付承認フロー
- Workflow可視化（提案作成→レビュー→承認）

### M2: 採用デモ

- 採用市況ジョブシグナル連携（live/mock）
- 候補者要約・面接調整・オファー承認
- Voice入力を用いた面接メモ導線

### M3: リサーチデモ

- EDINET + SEC + GDELT 連携（live/mock）
- 企業IR根拠付きブリーフ生成
- Connector IDE（Terminal/Test/StackTrace）で検証導線を提供

## 2. 実装順序

1. 新ユースケースの型・モック・ルーティングを置換
2. 外部API連携を connector 層に実装
3. 進捗/承認/成果物の操作導線を調整
4. ドキュメントと運用手順を更新

## 3. リスクと対策

- 外部APIのレート制限や一時障害
  - 対策: connectorで例外捕捉し mock へフォールバック
- ユースケースが抽象化されすぎる
  - 対策: 1-click Scenarioで具体的な業務手順を再現
- 情報過多で導線が埋もれる
  - 対策: Progressive Disclosure（高頻度操作を前面、監査情報はAuditへ集約）

## 4. 完了定義（DoD）

- `npm run dev` で起動し、`/sales` `/recruiting` `/research` を操作可能
- `npm run lint` / `npm run typecheck` が成功
- 5ドキュメント（SPEC/PLAN/ARCHITECTURE/TECHNICAL_DESIGN/RUNBOOK）が新ユースケースへ整合
