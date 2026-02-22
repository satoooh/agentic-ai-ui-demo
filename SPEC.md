# SPEC.md

## 1. 目的

**Japan Vertical Agentic Demo Lab** は、日本の業務課題を題材に AI Elements を使ったエージェンティックUIを短時間で体験できるデモ基盤である。

- 対象ドメイン: 建設 / 公共交通 / 官公庁データ活用
- 目的: 「AIがすごい」ではなく「この業務がどう減るか」を説明可能にする
- 前提: `DEMO_MODE=mock` で常時動作、`live` は段階連携

## 2. 成功条件（KPI）

- 初見のB2B関係者が3分以内に価値を言語化できる
- 3デモ合計で Chat / Workflow / Voice / Code カテゴリを網羅する
- すべてのデモで `入力 → 進捗 → 成果物 → 承認` が成立する

## 3. デモ一覧

### 3.1 建設: Construction SiteOps Copilot

- 主役要素: Voice, Attachments, Artifact, FileTree, Canvas, Confirmation
- 課題: 日報作成・写真台帳整理・KY/段取りの属人化
- 成果物: 日報ドラフト、写真台帳、翌日段取りフロー

### 3.2 公共交通: Transport Control Desk

- 主役要素: Queue, Tool, Message分岐, Voice/TTS, JSXPreview/WebPreview
- 課題: 監視から掲出までのオペレーション分断
- 成果物: 案内文（Web/駅表示/放送）、掲出プレビュー

### 3.3 官公庁データ活用: Gov Data Insight Studio

- 主役要素: ChainOfThought(作業ログ), Sources, InlineCitation, IDE要素, Workflow
- 課題: データ探索負荷、根拠提示、定期化実装のボトルネック
- 成果物: 根拠付きレポート、コネクタ生成プロジェクト（擬似）

## 4. 共通UX要件

- 共通レイアウト: 左 Queue / 中央 Conversation / 右 Plan・Task・Tool・Confirmation
- 共通機能:
  - モデル選択
  - コスト・トークン可視化
  - 承認フロー（副作用あり操作の必須化）
  - チェックポイント復元
  - ソース・引用の表示

## 5. データ連携要件

- 建設: 音声・写真・任意CSV（MVPはモック）
- 公共交通: ODPT（トークン必要、MVPはモック）
- 官公庁: e-GovメタデータAPI / e-Stat API（appId必要、MVPはモック）

## 6. 受け入れ基準

- mockモードで3デモが通しで操作できる
- 承認対象操作は承認なしで確定できない
- 成果物が画面上で確認でき、再確認可能な形で保持される
- live未設定時のエラーでフロー全体が停止しない
- LLMプロバイダは OpenAI / Gemini を切替可能である

## 7. 非機能要件

- 小さく可逆な差分で実装する
- UIの状態遷移が追跡できる（進捗/ログ/承認）
- 不足環境変数は Settings で明示する
