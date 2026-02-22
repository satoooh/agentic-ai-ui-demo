import type { DailyReportDraft, PhotoLedgerItem, WorkflowGraph } from "@/types/demo";

export const mockDailyReportDraft: DailyReportDraft = {
  weather: "晴れ",
  workSummary: "躯体2F配筋の先行エリアを完了。外構側の段取りを前倒しで実施。",
  workers: 14,
  machines: ["クレーン 25t", "高所作業車"],
  output: "配筋 320m2、型枠 180m2",
  safetyNotes: ["搬入動線が一時的に交差", "午後の強風により荷振れ注意"],
  tomorrowPlan: ["2F配筋残り 120m2", "配管スリーブ確認", "朝礼で動線再周知"],
};

export const mockPhotoLedger: PhotoLedgerItem[] = [
  {
    fileId: "img-001",
    date: "2026-02-22",
    section: "A工区",
    processTag: "配筋",
    locationTag: "2F東側",
    caption: "梁主筋の定着長さ確認",
  },
  {
    fileId: "img-002",
    date: "2026-02-22",
    section: "A工区",
    processTag: "型枠",
    locationTag: "2F西側",
    caption: "開口補強周りの型枠固定",
  },
];

export const mockWorkflowGraph: WorkflowGraph = {
  nodes: [
    { id: "n1", label: "朝礼で危険箇所共有", owner: "現場監督", status: "done" },
    { id: "n2", label: "資材搬入", owner: "職長", status: "doing" },
    { id: "n3", label: "2F配筋", owner: "鉄筋班", status: "todo" },
    { id: "n4", label: "出来高確定", owner: "元請担当", status: "todo" },
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" },
    { from: "n3", to: "n4" },
  ],
};
