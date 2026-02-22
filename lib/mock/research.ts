import type { Evidence, GeneratedConnectorProject, ResearchSignal, WorkflowGraph } from "@/types/demo";

export const mockResearchSignals: ResearchSignal[] = [
  {
    id: "ir-edinet-1",
    source: "edinet",
    kind: "ir_filing",
    title: "有価証券報告書（サンプル）",
    summary: "EDINET提出書類一覧から抽出したIR書類サンプルです。",
    url: "https://disclosure2dl.edinet-fsa.go.jp/searchdocument/pdf/S1000000.pdf",
    score: 94,
    publishedAt: "2026-02-21T00:00:00+09:00",
  },
  {
    id: "ir-sec-1",
    source: "sec",
    kind: "ir_filing",
    title: "Form 10-K (Sample)",
    summary: "SEC EDGAR submissions APIで取得した最新年次報告の例。",
    url: "https://www.sec.gov/ixviewer/ix.html?doc=/Archives/edgar/data/789019/000078901926000028/msft-20250630.htm",
    score: 91,
    publishedAt: "2026-02-20T00:00:00Z",
  },
  {
    id: "news-gdelt-1",
    source: "gdelt",
    kind: "public_news",
    title: "Public news signal (Sample)",
    summary: "GDELT Doc APIの企業名クエリで取得した最新ニュースの例。",
    url: "https://api.gdeltproject.org/api/v2/doc/doc",
    score: 78,
    publishedAt: "2026-02-21T09:30:00Z",
  },
];

export const mockResearchEvidence: Evidence[] = [
  {
    sourceTitle: "金融庁 EDINET API 利用登録",
    url: "https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/WEE0EZ0001.html",
    quote: "EDINET APIを利用するには利用登録による認証キーの取得が必要。",
  },
  {
    sourceTitle: "SEC EDGAR APIs",
    url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    quote: "EDGAR filing data can be requested through public JSON endpoints.",
  },
  {
    sourceTitle: "GDELT Doc API",
    url: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
    quote: "Global online news can be queried via the GDELT Doc API.",
  },
];

export const mockResearchConnectorProject: GeneratedConnectorProject = {
  files: ["connectors/edinet.ts", "connectors/sec-edgar.ts", "connectors/gdelt.ts", "pipelines/company-brief.ts"],
  tests: ["connectors/sec-edgar.test.ts", "pipelines/company-brief.test.ts"],
  envVars: ["DEMO_MODE", "EDINET_API_KEY", "SEC_USER_AGENT"],
};

export const mockResearchWorkflow: WorkflowGraph = {
  nodes: [
    { id: "q1", label: "企業名/証券コード入力", owner: "Analyst", status: "done" },
    { id: "q2", label: "IR書類取得（EDINET/SEC）", owner: "Agent", status: "doing" },
    { id: "q3", label: "公開ニュース収集（GDELT）", owner: "Agent", status: "todo" },
    { id: "q4", label: "示唆抽出と配布承認", owner: "Team Lead", status: "todo" },
  ],
  edges: [
    { from: "q1", to: "q2" },
    { from: "q2", to: "q3" },
    { from: "q3", to: "q4" },
  ],
};
