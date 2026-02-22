export type DemoMode = "mock" | "live";

export interface DailyReportDraft {
  weather: string;
  workSummary: string;
  workers: number;
  machines: string[];
  output: string;
  safetyNotes: string[];
  tomorrowPlan: string[];
}

export interface PhotoLedgerItem {
  fileId: string;
  date: string;
  section: string;
  processTag: string;
  locationTag: string;
  caption: string;
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

export interface OperationEvent {
  line: string;
  status: string;
  details: string;
  updatedAt: string;
  sourceUrl: string;
}

export interface AnnouncementDraft {
  web: string;
  stationDisplay: string;
  voiceScript: string;
  languages: string[];
}

export interface DatasetCandidate {
  title: string;
  org: string;
  landingUrl: string;
  apiHint: string;
}

export interface StatSeries {
  statsDataId: string;
  dimensions: string[];
  data: Array<{ label: string; value: number }>;
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
