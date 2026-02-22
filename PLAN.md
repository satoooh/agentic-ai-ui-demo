# PLAN.md

## 1. マイルストーン

### M0: 共通基盤

- Next.js App Router + TypeScript
- Tailwind v4 + daisyUI
- `mock/live` 切替付き API 雛形
- OpenAI / Gemini モデル切替
- Settings で環境変数可視化
- 3デモのページ枠（入力/進捗/成果物/承認）
- DBは雛形のみ（Drizzle + libsql/Turso を第一候補）

### M1: 建設デモ強化

- 音声入力UI（SpeechInput系）
- 日報/写真台帳の Artifact 化
- Canvas 段取りフロー編集

### M2: 官公庁データ活用強化

- e-Gov / e-Stat live 接続の実装
- 根拠付きレポート生成
- コネクタIDE（Terminal/TestResults/StackTrace）接続

### M3: 公共交通デモ強化

- ODPT live 接続
- TTS live 接続
- WebPreview / JSXPreview 連携

## 2. 実装順序

1. mockで全体フローを成立させる
2. 承認フロー（HITL）を全デモに共通化する
3. live連携を1デモずつ拡張する
4. Code/Voice/Workflow のUI部品を本実装へ置換する

## 3. リスクと対策

- APIキー未取得でデモ停止
  - 対策: Settingsで不足を明示、mock fallbackを常時有効
- 音声ブラウザ差分で不安定
  - 対策: transcribe APIのフォールバック設計を先に入れる
- live連携の仕様変更
  - 対策: connector層を分離し、UIはモック契約を固定

## 4. 完了定義（DoD）

- `npm run dev` で起動し、3デモに遷移できる
- `npm run lint` / `npm run typecheck` が成功
- 5ドキュメントの更新と実装差分が整合する
