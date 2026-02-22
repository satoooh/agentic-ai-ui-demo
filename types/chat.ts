import type { UIMessage } from "ai";
import type { DemoMode, WorkflowGraph } from "@/types/demo";

export type DemoId = "sales" | "recruiting" | "meeting" | "research";

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
  }
>;
