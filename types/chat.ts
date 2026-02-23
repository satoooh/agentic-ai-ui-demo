import type { UIMessage } from "ai";
import type { DemoMode, WorkflowGraph } from "@/types/demo";

export type DemoId = "meeting" | "research";

export type ModelProvider = "openai" | "gemini";

export interface QueueItem {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
}

export interface PlanStep {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
}

export interface TaskItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ArtifactItem {
  id: string;
  name: string;
  kind: "markdown" | "json" | "html" | "text" | "code";
  content: string;
  updatedAt: string;
}

export interface ToolEvent {
  id: string;
  name: string;
  status: "running" | "success" | "error";
  detail: string;
  timestamp: string;
}

export interface ApprovalRequest {
  required: boolean;
  action: string;
  reason: string;
}

export interface CitationItem {
  id: string;
  title: string;
  url: string;
  quote?: string;
}

export interface CodeSnippet {
  id: string;
  fileName: string;
  language: string;
  content: string;
}

export interface StructuredRisk {
  title: string;
  impact: string;
  mitigation: string;
  severity: "low" | "medium" | "high";
}

export interface StructuredAction {
  task: string;
  owner: string;
  due: string;
  metric: string;
  priority: "high" | "medium" | "low";
}

export interface StructuredEvidence {
  claim: string;
  support: string;
  nextCheck: string;
}

export interface StructuredWorklogStep {
  id: string;
  label: string;
  detail: string;
  status: "todo" | "doing" | "done";
  tags: string[];
}

export interface StructuredInsight {
  headline: string;
  summary: string;
  keyPoints: string[];
  risks: StructuredRisk[];
  actions: StructuredAction[];
  evidence: StructuredEvidence[];
  worklog: StructuredWorklogStep[];
}

export interface DemoSessionSnapshot {
  id: string;
  demo: DemoId;
  mode: DemoMode;
  modelProvider: ModelProvider;
  modelId: string;
  title: string;
  messages: DemoUIMessage[];
  queue: QueueItem[];
  plan: PlanStep[];
  tasks: TaskItem[];
  artifacts: ArtifactItem[];
  tools: ToolEvent[];
  workflow?: WorkflowGraph;
  updatedAt: string;
}

export type DemoUIMessage = UIMessage<
  never,
  {
    queue: QueueItem;
    plan: { steps: PlanStep[] };
    task: { items: TaskItem[] };
    artifact: ArtifactItem;
    tool: ToolEvent;
    approval: ApprovalRequest;
    citation: CitationItem;
    code: CodeSnippet;
    status: { phase: string; message: string };
    structured: StructuredInsight;
  }
>;
