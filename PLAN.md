# PLAN.md

## 1. マイルストーン

### M1: UI簡素化（完了基準: 主要導線のみ表示）

- ヘッダーの右メニュー撤去
- 会議レビュー/企業調査の共通チャットレイアウト整理
- 詳細モードUI（IDE/Workflow/Audit）の非表示化

### M2: 会議レビューAI最適化

- Step 1 議事録入力を必須化
- 議事録確定後にチャットを開始
- `Reasoning` / `Sources` / `InlineCitation` / `Suggestion` の導線最適化

### M3: 企業調査AI最適化

- タイトル表示を簡素化（台座カードを撤去）
- 根拠リンクを箇条書き表示
- 右カラム TL;DR 固定で、チャット幅変動を抑制

## 2. 実装順序

1. ナビゲーションとレイアウト幅の統一
2. `DemoWorkspace` の入力/送信/右カラム制御
3. `meeting` / `research` ページの不要機能削除
4. ドキュメント更新と動作検証

## 3. リスクと対策

- UI削減により既存導線が失われる
  - 対策: Home から `/meeting` `/research` への導線を維持
- 送信キー仕様変更で入力体験が混乱する
  - 対策: プレースホルダーに `Cmd/Ctrl+Enter` を明記
- 推論ログ表示が冗長になる
  - 対策: `Reasoning` を折りたたみデフォルトで運用

## 4. 完了定義（DoD）

- `/meeting` `/research` がシンプルUIで動作
- `Cmd/Ctrl+Enter` 送信仕様が有効
- 右カラムTL;DRが固定表示される
- `npm run lint` / `npm run typecheck` 成功
