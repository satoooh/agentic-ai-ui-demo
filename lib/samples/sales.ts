import type { SalesAccountInsight, SalesOutreachDraft, WorkflowGraph } from "@/types/demo";

export const sampleSalesAccountInsight: SalesAccountInsight = {
  orgLogin: "vercel",
  displayName: "Vercel",
  website: "https://vercel.com",
  followers: 18473,
  publicRepos: 423,
  topRepositories: [
    {
      name: "next.js",
      stars: 138000,
      language: "JavaScript",
      updatedAt: "2026-02-20T04:17:00Z",
      url: "https://github.com/vercel/next.js",
    },
    {
      name: "ai",
      stars: 16800,
      language: "TypeScript",
      updatedAt: "2026-02-21T01:12:00Z",
      url: "https://github.com/vercel/ai",
    },
    {
      name: "turborepo",
      stars: 28500,
      language: "TypeScript",
      updatedAt: "2026-02-20T12:44:00Z",
      url: "https://github.com/vercel/turborepo",
    },
  ],
};

export const sampleSalesOutreachDraft: SalesOutreachDraft = {
  account: "Acme SaaS",
  objective: "開発生産性改善の商談化",
  talkTrack: [
    "現状の開発フローで詰まりやすい箇所をヒアリング",
    "現場工数の可視化とリードタイム短縮案を提示",
    "導入後90日での成果指標を合意",
  ],
  followUpTasks: ["提案資料ドラフト作成", "ROI試算の送付", "次回MTG候補日を提示"],
};

export const sampleSalesWorkflow: WorkflowGraph = {
  nodes: [
    { id: "s1", label: "アカウント調査", owner: "AE", status: "done" },
    { id: "s2", label: "提案骨子作成", owner: "Sales Ops", status: "done" },
    { id: "s3", label: "反証シミュレーション", owner: "Agent", status: "doing" },
    { id: "s4", label: "次アクション生成", owner: "AE", status: "todo" },
  ],
  edges: [
    { from: "s1", to: "s2" },
    { from: "s2", to: "s3" },
    { from: "s3", to: "s4" },
  ],
};
