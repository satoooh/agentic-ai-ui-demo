# SPEC.md

## 1. 目的

**Japan Vertical Agentic Demo Lab** を、IT企業で汎用性の高い業務領域に再定義する。

- 対象ドメイン: 営業 / 採用 / 企業調査（IR/公開情報）
- 目的: 「この業務のどこが短縮されるか」を3分で説明できるデモにする
- 前提: `DEMO_MODE=mock` で常時動作し、`live` は段階連携

## 2. 調査インサイト（ユースケース再定義の根拠）

- 営業: Salesforce「State of Sales」では、営業は販売以外の活動にも多くの時間を割いており、業務自動化の余地が示されている。  
  https://www.salesforce.com/ap/resources/state-of-sales/
- 採用: LinkedIn「Future of Recruiting」では、採用担当に事業成果へ直結する役割がより求められている。  
  https://business.linkedin.com/talent-solutions/future-of-recruiting
- UX: NN/g の Progressive Disclosure は、初期表示を最小化して段階的に詳細を見せる設計を推奨している。  
  https://www.nngroup.com/articles/progressive-disclosure/

上記より、デモは「入力UIを盛る」よりも、進捗・承認・成果物の導線を短くする設計を優先する。

## 3. デモ一覧

### 3.1 営業: Sales Enablement Copilot

- 主役要素: Queue / Plan / Artifact / Confirmation / Workflow
- 課題: アカウント調査、提案骨子作成、送付承認が分断される
- 成果物: account brief / outreach plan / mail draft

### 3.2 採用: Recruiting Ops Copilot

- 主役要素: Conversation / Task / Artifact / Checkpoint / Confirmation
- 課題: 候補者要約、面接調整、評価回収、オファー承認が遅延する
- 成果物: candidate brief / interview plan / market signals

### 3.3 企業調査: Public Intelligence Studio

- 主役要素: Sources / InlineCitation / Terminal / TestResults / StackTrace / Commit
- 課題: 企業IRの収集と公開情報分析が手作業で、根拠確認に時間がかかる
- 成果物: company IR brief / filings list / connector project

## 4. 共通UX要件

- 共通レイアウト: 左（Queue/Scenario） / 中央（Conversation） / 右（Execution/Ops/Audit）
- 共通機能:
  - モデル選択（OpenAI / Gemini）
  - Contextによるトークン使用量可視化
  - 承認必須操作（送信/オファー/配布）を Confirmation で停止
  - Checkpoint復元
  - Artifactsの preview/copy/download

## 5. データ連携要件

- 営業: GitHub組織情報（`/api/connectors/sales-account`）
- 採用: Arbeitnow Job API（`/api/connectors/recruiting-market`）
- 企業調査: SEC EDGAR + GDELT + Wikidata（`/api/connectors/research-signal`）
- すべて live 失敗時は mock へフォールバック

## 6. 受け入れ基準

- mockモードで3デモの通し操作が成立する
- 承認対象操作は承認無しで確定できない
- 成果物が保存・再表示できる
- live未設定や外部API失敗でフロー全体が停止しない
- LLMプロバイダを OpenAI / Gemini で切替できる
