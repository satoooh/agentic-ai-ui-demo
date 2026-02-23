# SPEC.md

## 1. 目的

**Agentic UI Demo** として、以下2ユースケースに特化した実務デモを提供する。

- 会議レビューAI
- 企業調査AI

目的は「業務でどう使うか」を短時間で理解できること。  
すべての会話処理は LLM 実行（OpenAI / Gemini）を前提とする。

## 2. デモ要件

### 2.1 会議レビューAI

- 入力: 議事録（必須）
- 処理: 要約 / 反証レビュー（悪魔の代弁者） / 次アクション整理
- UI要件:
  - Step 1 で議事録確定後にチャット開始
  - `Reasoning` で推論ログを展開表示
  - `PromptInput` を利用し、`Cmd+Enter`（Windowsは`Ctrl+Enter`）で送信
  - `Sources` / `InlineCitation` で根拠提示
  - 右カラムに TL;DR 固定表示

### 2.2 企業調査AI

- 入力: 調査目的（自然文）
- 処理: 公開情報収集（PDF含む） / 根拠付き要点化 / 次探索提案
- UI要件:
  - チャット中心の1画面導線
  - `Reasoning` / `Sources` / `InlineCitation` を主役化
  - 右カラムに TL;DR 固定表示
  - 研究IDE・ワークフロー編集などの詳細モードは表示しない

## 3. 共通UX要件

- 余計な導線を削減し、初見で「次に何を押すか」が分かる
- 主要操作は `Suggestion` で入力補助
- 成果物は回答生成後のみ表示（コピー/ダウンロード可能）
- ヘッダーは簡素化し、左のプロダクト名クリックでホームへ戻れる

## 4. 受け入れ基準

- `/meeting` と `/research` が `npm run dev` で起動・操作できる
- Enter単独では送信されず、`Cmd/Ctrl+Enter` のみ送信される
- 右カラム TL;DR が常時レイアウトに確保され、幅ジャンプが発生しない
- `npm run lint` / `npm run typecheck` が成功する
