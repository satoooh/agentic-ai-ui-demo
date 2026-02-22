import type { MeetingSignal, WorkflowGraph } from "@/types/demo";

export const mockMeetingTranscript = {
  title: "営業・採用横断の週次オペレーション会議",
  participants: ["営業責任者", "採用責任者", "PM", "経営企画"],
  excerpt:
    "Q2は採用を優先しつつ、既存顧客の追加提案も増やす。現場の負荷が高いため、" +
    "来月までは新規施策を増やしすぎない方針。",
};

export const mockMeetingReview = {
  summary:
    "リソース制約下で採用と売上の両立を目指す方針。優先順位の明確化と実行条件の定義が不足している。",
  assumptions: [
    "既存顧客向け提案は現場負荷を増やさずに実行できる",
    "採用のボトルネックは候補者数不足であり、選考プロセスではない",
    "来月の市場環境は大きく変化しない",
  ],
  counterArguments: [
    "追加提案はCS対応を増やし、短期的に現場負荷を悪化させる可能性がある",
    "採用停滞の主要因は候補者数ではなく選考速度と評価基準の不一致かもしれない",
    "競合の値下げや市場変化で既存提案が刺さらなくなる可能性がある",
  ],
  nextActions: [
    "1週間で実行可能な施策だけに絞った優先順位表を作成する",
    "採用は歩留まり分解（応募→書類→面接→内定）でボトルネックを再特定する",
    "提案施策の失敗条件を先に定義し、毎週レビューする",
  ],
};

export const mockMeetingSignals: MeetingSignal[] = [
  {
    id: "meeting-signal-1",
    source: "mock",
    title: "Hiring slowdown and process bottlenecks",
    summary: "採用市場では候補者不足より選考速度と候補者体験が離脱要因になりやすい。",
    url: "https://example.local/meeting-signals/hiring-bottleneck",
    points: 132,
    comments: 41,
    publishedAt: "2026-02-20T09:20:00Z",
  },
  {
    id: "meeting-signal-2",
    source: "mock",
    title: "B2B expansion under constrained teams",
    summary: "新規施策より既存運用の自動化を優先した方が短期成果が出やすい。",
    url: "https://example.local/meeting-signals/b2b-expansion",
    points: 98,
    comments: 27,
    publishedAt: "2026-02-19T14:10:00Z",
  },
];

export const mockMeetingWorkflow: WorkflowGraph = {
  nodes: [
    { id: "m1", label: "議事録入力", owner: "Facilitator", status: "done" },
    { id: "m2", label: "主張・前提の抽出", owner: "Agent", status: "done" },
    { id: "m3", label: "悪魔の代弁者レビュー", owner: "Agent", status: "doing" },
    { id: "m4", label: "反証を踏まえた修正案", owner: "Team Lead", status: "todo" },
    { id: "m5", label: "次アクション確定", owner: "PM", status: "todo" },
  ],
  edges: [
    { from: "m1", to: "m2" },
    { from: "m2", to: "m3" },
    { from: "m3", to: "m4" },
    { from: "m4", to: "m5" },
  ],
};
