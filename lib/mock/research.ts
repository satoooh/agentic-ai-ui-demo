import type { Evidence, GeneratedConnectorProject, ResearchSignal, WorkflowGraph } from "@/types/demo";

export const mockResearchSignals: ResearchSignal[] = [
  {
    id: "rs-hn-1",
    source: "hn",
    title: "LLM Inference Cost Optimization at Scale",
    summary: "大規模運用での推論コスト最適化戦略を具体例付きで解説。",
    url: "https://news.ycombinator.com/item?id=10000001",
    score: 248,
    publishedAt: "2026-02-21T08:20:00Z",
  },
  {
    id: "rs-gh-1",
    source: "github",
    title: "langgraph",
    summary: "Agent orchestrationに関する人気OSS。直近開発も活発。",
    url: "https://github.com/langchain-ai/langgraph",
    score: 18900,
    publishedAt: "2026-02-20T14:40:00Z",
  },
  {
    id: "rs-gh-2",
    source: "github",
    title: "mastra",
    summary: "AIワークフローとツール統合を扱うOSS。実装サンプルが豊富。",
    url: "https://github.com/mastra-ai/mastra",
    score: 11200,
    publishedAt: "2026-02-19T02:10:00Z",
  },
];

export const mockResearchEvidence: Evidence[] = [
  {
    sourceTitle: "Salesforce State of Sales",
    url: "https://www.salesforce.com/ap/resources/state-of-sales/",
    quote: "営業担当者が実際の販売に使える時間は一部で、非コア業務の削減余地が大きい。",
  },
  {
    sourceTitle: "LinkedIn Future of Recruiting 2025",
    url: "https://business.linkedin.com/talent-solutions/future-of-recruiting",
    quote: "採用担当は採用成功を売上・事業目標に紐づける役割を強く求められている。",
  },
  {
    sourceTitle: "NN/g: Progressive Disclosure",
    url: "https://www.nngroup.com/articles/progressive-disclosure/",
    quote: "初期表示は必要最小限にし、詳細は段階的に開示するのが有効。",
  },
];

export const mockResearchConnectorProject: GeneratedConnectorProject = {
  files: ["connectors/github.ts", "connectors/hn.ts", "pipelines/weekly-brief.ts"],
  tests: ["connectors/github.test.ts", "pipelines/weekly-brief.test.ts"],
  envVars: ["DEMO_MODE", "GITHUB_TOKEN"],
};

export const mockResearchWorkflow: WorkflowGraph = {
  nodes: [
    { id: "q1", label: "トピック分解", owner: "Analyst", status: "done" },
    { id: "q2", label: "外部ソース取得", owner: "Agent", status: "doing" },
    { id: "q3", label: "根拠付き要約", owner: "Agent", status: "todo" },
    { id: "q4", label: "配布承認", owner: "Team Lead", status: "todo" },
  ],
  edges: [
    { from: "q1", to: "q2" },
    { from: "q2", to: "q3" },
    { from: "q3", to: "q4" },
  ],
};
