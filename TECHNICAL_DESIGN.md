# TECHNICAL_DESIGN.md

## 1. ディレクトリ

```text
app/
  (demos)/
    meeting/page.tsx
    research/page.tsx
  settings/page.tsx
  api/chat/route.ts
  api/connectors/{meeting-signal,research-signal}/route.ts
  api/sessions/route.ts
  api/sessions/[id]/route.ts
components/
  common/
    site-nav.tsx
    section-card.tsx
  demos/
    demo-workspace.tsx
lib/
  env.ts
  db/{client,schema,repository}.ts
  connectors/
  samples/
types/
  chat.ts
  demo.ts
```

## 2. 主要UI要素

- `Conversation`
- `PromptInput`
- `Reasoning`
- `Sources` / `InlineCitation`
- `Suggestion`
- `Artifact`
- `OpenIn`（ChatGPT / Claude）

## 3. 送信仕様

- Enter単独: 送信しない
- `Cmd+Enter` / `Ctrl+Enter`: 送信
- `Shift+Enter`: 改行
- `Esc`（streaming中）: 停止

## 4. レイアウト仕様

- 会議レビュー: Step 1（議事録入力）完了後にチャット表示
- 会議レビュー/企業調査ともに、チャット＋右TL;DRの2カラムを維持
- 右カラムはスクロール時に固定（sticky）

## 5. 非表示化した機能

- 詳細モード切替導線
- 研究IDE/Workflow関連パネル
- 初期表示のTaskコーナー（混乱回避のため）
