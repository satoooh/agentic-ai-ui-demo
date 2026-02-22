export type DemoMode = "mock" | "live";

export interface SalesOutreachDraft {
  account: string;
  objective: string;
  talkTrack: string[];
  followUpTasks: string[];
}

export interface SalesAccountInsight {
  orgLogin: string;
  displayName: string;
  website: string;
  followers: number;
  publicRepos: number;
  topRepositories: Array<{
    name: string;
    stars: number;
    language: string;
    updatedAt: string;
    url: string;
  }>;
}

export interface RecruitingJobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  tags: string[];
  url: string;
  publishedAt: string;
}

export interface CandidateBrief {
  candidateId: string;
  role: string;
  highlights: string[];
  concerns: string[];
  recommendation: "strong_yes" | "yes" | "hold" | "no";
}

export interface ResearchSignal {
  id: string;
  source: "edinet" | "sec" | "gdelt" | "mock";
  kind: "ir_filing" | "public_news" | "regulatory_note";
  title: string;
  summary: string;
  url: string;
  score: number;
  publishedAt: string;
}

export interface CorporateResearchSnapshot {
  query: string;
  requestedAt: string;
  filings: ResearchSignal[];
  news: ResearchSignal[];
  notes: string[];
}

export interface WorkflowNode {
  id: string;
  label: string;
  owner: string;
  status: "todo" | "doing" | "done";
}

export interface WorkflowEdge {
  from: string;
  to: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Evidence {
  sourceTitle: string;
  url: string;
  quote: string;
}

export interface GeneratedConnectorProject {
  files: string[];
  tests: string[];
  envVars: string[];
}
