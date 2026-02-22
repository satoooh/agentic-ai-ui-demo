import type { Evidence, GeneratedConnectorProject, ResearchSignal, WorkflowGraph } from "@/types/demo";

export const sampleResearchSignals: ResearchSignal[] = [
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
  {
    id: "profile-wikidata-1",
    source: "wikidata",
    kind: "regulatory_note",
    title: "Microsoft - Wikidata profile (Sample)",
    summary: "企業の基本属性（説明、同義語、識別子）をWikidataから補完。",
    url: "https://www.wikidata.org/wiki/Q2283",
    score: 74,
    publishedAt: "2026-02-21T09:35:00Z",
  },
];

export const sampleResearchEvidence: Evidence[] = [
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
  {
    sourceTitle: "MediaWiki Action API",
    url: "https://www.mediawiki.org/wiki/API:Action_API",
    quote: "Wikidata/Wikipediaの情報はAction API経由で取得可能。",
  },
];

export const sampleResearchConnectorProject: GeneratedConnectorProject = {
  files: ["connectors/sec-edgar.ts", "connectors/gdelt.ts", "connectors/wikidata.ts", "pipelines/company-brief.ts"],
  tests: ["connectors/sec-edgar.test.ts", "connectors/wikidata.test.ts", "pipelines/company-brief.test.ts"],
  envVars: ["SEC_USER_AGENT"],
};

export const sampleResearchWorkflow: WorkflowGraph = {
  nodes: [
    { id: "q1", label: "企業名/証券コード入力", owner: "Analyst", status: "done" },
    { id: "q2", label: "IR書類取得（SEC）", owner: "Agent", status: "doing" },
    { id: "q3", label: "公開ニュース収集（GDELT）", owner: "Agent", status: "todo" },
    { id: "q4", label: "企業属性補完（Wikidata）", owner: "Agent", status: "todo" },
    { id: "q5", label: "示唆抽出と次探索生成", owner: "Team Lead", status: "todo" },
  ],
  edges: [
    { from: "q1", to: "q2" },
    { from: "q2", to: "q3" },
    { from: "q3", to: "q4" },
    { from: "q4", to: "q5" },
  ],
};
