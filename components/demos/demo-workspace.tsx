"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { ChevronRightIcon, PanelsRightBottomIcon } from "lucide-react";
import {
  Artifact as ArtifactPanel,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import {
  Checkpoint as CheckpointBar,
  CheckpointIcon,
  CheckpointTrigger,
} from "@/components/ai-elements/checkpoint";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Context as ContextMeter,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  OpenIn,
  OpenInChatGPT,
  OpenInClaude,
  OpenInContent,
  OpenInLabel,
  OpenInSeparator,
  OpenInTrigger,
  OpenInv0,
} from "@/components/ai-elements/open-in-chat";
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import {
  Queue as QueuePanel,
  QueueItem as QueueEntry,
  QueueItemContent,
  QueueItemDescription,
  QueueItemIndicator,
  QueueList,
} from "@/components/ai-elements/queue";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Task,
  TaskContent,
  TaskItem as TaskEntry,
  TaskTrigger,
} from "@/components/ai-elements/task";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { meetingTranscriptSamples } from "@/lib/samples/meeting";
import { getDefaultModel, MODEL_OPTIONS } from "@/lib/models";
import type {
  ApprovalRequest,
  ArtifactItem,
  CitationItem,
  DemoId,
  DemoSessionSnapshot,
  DemoUIMessage,
  ModelProvider,
  PlanStep,
  QueueItem,
  StructuredInsight,
  TaskItem,
  ToolEvent,
} from "@/types/chat";
import type { WorkflowGraph } from "@/types/demo";
import { cn } from "@/lib/utils";

interface Checkpoint {
  id: string;
  label: string;
  messages: DemoUIMessage[];
  queue: QueueItem[];
  plan: PlanStep[];
  tasks: TaskItem[];
  artifacts: ArtifactItem[];
  tools: ToolEvent[];
  citations: CitationItem[];
  structuredInsight?: StructuredInsight | null;
}

interface DemoScenarioStep {
  id: string;
  label: string;
  prompt: string;
  approved?: boolean;
}

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  outcome?: string;
  targetDurationSec?: number;
  steps: DemoScenarioStep[];
}

interface ApprovalLogItem {
  id: string;
  action: string;
  reason: string;
  status: "pending" | "approved" | "dismissed";
  timestamp: string;
}

interface RuntimeInfo {
  hasOpenAIKey: boolean;
  hasGeminiKey: boolean;
}

interface WorklogStep {
  id: string;
  label: string;
  description: string;
  status: "complete" | "active" | "pending";
  tags: string[];
}

interface MeetingTimelineEntry {
  id: string;
  phase: string;
  title: string;
  detail: string;
  status: WorklogStep["status"];
}

interface LiveAgentStep {
  id: string;
  label: string;
  detail: string;
  status: PlanStep["status"];
}

interface AgenticLane {
  id: string;
  label: string;
  state: "todo" | "doing" | "done";
  detail: string;
}

interface MeetingProfile {
  id: string;
  label: string;
  objective: string;
  participants: string;
  expectedOutput: string;
  keyTopics: string[];
}

interface MeetingOutputTemplate {
  title: string;
  sections: string[];
  actionColumns: string[];
}

const MEETING_PROFILES: MeetingProfile[] = [
  {
    id: "auto-any",
    label: "会議タイプ自動推定",
    objective: "議事録から会議タイプを推定し、合意形成と実行準備を加速する",
    participants: "議事録から推定",
    expectedOutput: "決定事項、反証レビュー、実行アクション",
    keyTopics: ["決定事項", "未決事項", "前提リスク", "次アクション"],
  },
  {
    id: "sales-weekly",
    label: "営業週次",
    objective: "案件の進捗、失注リスク、次回打ち手を確定する",
    participants: "営業責任者, AE, CS",
    expectedOutput: "優先案件リスト、リスク対策、次回アクション",
    keyTopics: ["案件進捗", "失注リスク", "提案修正", "次回打ち手"],
  },
  {
    id: "hiring-sync",
    label: "採用進捗",
    objective: "採用歩留まりを確認し、詰まりを解消する",
    participants: "採用責任者, Recruiter, Hiring Manager",
    expectedOutput: "ボトルネック分析、面接改善、次探索条件",
    keyTopics: ["歩留まり", "面接品質", "辞退要因", "再探索条件"],
  },
  {
    id: "product-planning",
    label: "プロダクト計画",
    objective: "次スプリントの優先順位とリスクを整理する",
    participants: "PM, Tech Lead, Designer",
    expectedOutput: "実行順序、依存関係、意思決定メモ",
    keyTopics: ["優先順位", "依存関係", "リリースリスク", "スコープ調整"],
  },
  {
    id: "exec-review",
    label: "経営レビュー",
    objective: "重要意思決定の前提を検証し、判断材料を固める",
    participants: "CEO, 事業責任者, 経営企画",
    expectedOutput: "判断前提、反証シナリオ、検証タスク",
    keyTopics: ["意思決定前提", "下振れシナリオ", "投資配分", "検証タスク"],
  },
];

const MEETING_OUTPUT_TEMPLATES: Record<MeetingProfile["id"], MeetingOutputTemplate> = {
  "auto-any": {
    title: "会議レビューAI",
    sections: ["決定事項と未決事項", "反証レビュー（悪魔の代弁者）", "修正アクション"],
    actionColumns: ["タスク", "担当", "期限", "成功条件"],
  },
  "sales-weekly": {
    title: "営業週次レビュー",
    sections: ["案件進捗サマリ", "失注リスク（悪魔の代弁者）", "打ち手の修正案"],
    actionColumns: ["案件", "担当", "期限", "検証指標"],
  },
  "hiring-sync": {
    title: "採用進捗レビュー",
    sections: ["採用歩留まりサマリ", "ミスマッチ仮説（悪魔の代弁者）", "選考改善案"],
    actionColumns: ["候補者/施策", "担当", "期限", "検証指標"],
  },
  "product-planning": {
    title: "プロダクト計画レビュー",
    sections: ["優先順位サマリ", "計画破綻リスク（悪魔の代弁者）", "依存関係の修正案"],
    actionColumns: ["タスク", "担当", "期限", "ブロッカー"],
  },
  "exec-review": {
    title: "経営レビュー",
    sections: ["意思決定サマリ", "前提崩壊シナリオ（悪魔の代弁者）", "判断条件の修正案"],
    actionColumns: ["意思決定項目", "担当", "期限", "検証データ"],
  },
};

function buildMeetingOutputFormatInstruction(profile: MeetingProfile): string {
  const template = MEETING_OUTPUT_TEMPLATES[profile.id];
  return [
    `出力フォーマット（${template.title}）:`,
    "1. 会議要約（3行以内）",
    ...template.sections.map((section, index) => `${index + 2}. ${section}`),
    `${template.sections.length + 2}. 次アクション表（列: ${template.actionColumns.join(" / ")}）`,
    `${template.sections.length + 3}. 不足データと次回確認事項`,
  ].join("\n");
}

function getMeetingSuggestions(profile: MeetingProfile): string[] {
  const template = MEETING_OUTPUT_TEMPLATES[profile.id];
  if (profile.id === "auto-any") {
    return [
      "議事録から決定事項・未決事項・次アクションを抽出して",
      "前提崩壊の失敗シナリオを2件だけ先に示して",
      `${template.title}形式で会議後の実行計画（担当/期限/成功条件）を作って`,
      "会議の論点を根拠付きで3つに圧縮して",
      "次回会議までに必要な追加確認データを優先順で出して",
    ];
  }

  return [
    `${profile.label}として、この会議の決定事項と保留事項を整理して`,
    `${profile.keyTopics[0]}と${profile.keyTopics[1]}の観点で見落としを指摘して`,
    `${profile.label}向けに悪魔の代弁者レビューを実行して`,
    `${template.title}の形式で次回までのアクション表を作成して`,
    `${profile.label}で最優先に検証すべき前提を3つ挙げて`,
  ];
}

function buildMeetingScenario(profile: MeetingProfile): DemoScenario {
  const template = MEETING_OUTPUT_TEMPLATES[profile.id];
  const profileContext =
    profile.id === "auto-any"
      ? "会議タイプを議事録から自動推定して"
      : `${profile.label}として`;
  const topicHint =
    profile.id === "auto-any"
      ? "意思決定 / リスク / 次アクション / 未確定事項"
      : profile.keyTopics.join(" / ");

  return {
    id: `meeting-loop-${profile.id}`,
    title: profile.id === "auto-any" ? "会議レビューAIシナリオ" : `${profile.label}シナリオ`,
    description: "主要論点に沿って、反証レビューから次アクション確定まで実行。",
    outcome: `${profile.expectedOutput}を短時間で作成`,
    targetDurationSec: 62,
    steps: [
      {
        id: `meeting-${profile.id}-step-1`,
        label: "議事録要約",
        prompt: `${profileContext}、議事録から決定事項と保留事項を整理してください。`,
      },
      {
        id: `meeting-${profile.id}-step-2`,
        label: "主要論点抽出",
        prompt: `主要論点（${topicHint}）ごとに論点と不足データを整理してください。`,
      },
      {
        id: `meeting-${profile.id}-step-3`,
        label: "悪魔の代弁者",
        prompt: "前提に対して悪魔の代弁者レビューを実行し、失敗シナリオを2件提示してください。",
      },
      {
        id: `meeting-${profile.id}-step-4`,
        label: "次アクション確定",
        prompt: `${template.title}の形式で、次回までのアクション表を作成してください。`,
      },
    ],
  };
}

interface DemoWorkspaceProps {
  demo: DemoId;
  title: string;
  subtitle: string;
  suggestions: string[];
  scenarios?: DemoScenario[];
  initialQueue: QueueItem[];
  initialPlan: PlanStep[];
  initialTasks: TaskItem[];
  initialArtifacts: ArtifactItem[];
  initialCitations?: CitationItem[];
  enableVoice?: boolean;
  enableTts?: boolean;
  workflow?: WorkflowGraph;
  topPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) {
    return [item, ...items];
  }

  const next = [...items];
  next[index] = item;
  return next;
}

function getMessageText(message: DemoUIMessage): string {
  return message.parts
    .filter((part): part is Extract<DemoUIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function normalizeSummaryLine(line: string): string {
  return line.replace(/^[-*•]\s+/, "").replace(/^\d+\.\s+/, "").trim();
}

function extractLatestAssistantSummary(messages: DemoUIMessage[]): {
  summary: string;
  bullets: string[];
} | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }

    const text = getMessageText(message);
    if (!text) {
      continue;
    }

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("```"))
      .filter((line) => !line.startsWith("|"))
      .filter((line) => !line.startsWith(">"));

    if (lines.length === 0) {
      continue;
    }

    const normalized = lines.map(normalizeSummaryLine).filter((line) => line.length > 0);
    if (normalized.length === 0) {
      continue;
    }

    const summary =
      normalized.find(
        (line) =>
          !line.startsWith("#") &&
          !line.includes("要点サマリー") &&
          !line.includes("重要な論点") &&
          !line.includes("次アクション"),
      ) ?? normalized[0];

    const bullets = normalized.filter((line) => line !== summary).slice(0, 3);
    return { summary, bullets };
  }

  return null;
}

function buildConversationTranscript(messages: DemoUIMessage[]): string {
  return messages
    .map((message) => {
      const text = getMessageText(message);
      if (!text) {
        return "";
      }
      const role = message.role === "user" ? "User" : "Assistant";
      return `${role}: ${text}`;
    })
    .filter(Boolean)
    .slice(-12)
    .join("\n");
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function estimateCostUsd({
  provider,
  inputTokens,
  outputTokens,
}: {
  provider: ModelProvider;
  inputTokens: number;
  outputTokens: number;
}): number {
  if (provider === "openai") {
    return inputTokens * 0.000001 + outputTokens * 0.000004;
  }

  return inputTokens * 0.0000005 + outputTokens * 0.000002;
}

function getSeverityStyle(severity: QueueItem["severity"]) {
  if (severity === "critical") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-sky-200 bg-sky-50 text-sky-800";
}

function getStatusBadgeStyle(status: PlanStep["status"] | ToolEvent["status"]) {
  if (status === "done" || status === "success") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "doing" || status === "running") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-200 text-slate-700";
}

function getStatusLabel(status: PlanStep["status"] | ToolEvent["status"]) {
  if (status === "done" || status === "success") {
    return "完了";
  }
  if (status === "doing" || status === "running") {
    return "実行中";
  }
  if (status === "error") {
    return "失敗";
  }
  return "待機";
}

function toToolUiState(status: ToolEvent["status"]) {
  if (status === "success") {
    return "output-available" as const;
  }

  if (status === "error") {
    return "output-error" as const;
  }

  return "input-available" as const;
}

function compactUiText(value: string, maxLength = 84): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength)}…`;
}

function getAgentLaneStyle(state: "todo" | "doing" | "done") {
  if (state === "done") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (state === "doing") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function toWorklogStatus(status: PlanStep["status"]): WorklogStep["status"] {
  if (status === "done") {
    return "complete";
  }

  if (status === "doing") {
    return "active";
  }

  return "pending";
}

function findLatestToolEvent(
  tools: ToolEvent[],
  predicate: (tool: ToolEvent) => boolean,
): ToolEvent | null {
  for (const tool of tools) {
    if (predicate(tool)) {
      return tool;
    }
  }
  return null;
}

function ConversationAutoFollower({
  enabled,
  followKey,
}: {
  enabled: boolean;
  followKey: string;
}) {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      void scrollToBottom("smooth");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [enabled, followKey, scrollToBottom]);

  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function hasRequiredMeetingTranscript(text: string): boolean {
  return text.trim().length >= 20;
}

function deriveTranscriptHeadline({
  transcript,
  profileLabel,
}: {
  transcript: string;
  profileLabel: string;
}): string {
  const normalizedProfileLabel =
    profileLabel.includes("自動推定") || profileLabel.includes("自動判定")
      ? "会議レビュー"
      : profileLabel;

  const firstLine = transcript
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return `${normalizedProfileLabel}レビュー`;
  }

  const normalized = firstLine
    .replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, "")
    .replace(/^[^:]{1,24}:\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return `${normalizedProfileLabel}レビュー`;
  }

  const cropped = normalized.slice(0, 26);
  return `${normalizedProfileLabel}: ${cropped}${normalized.length > 26 ? "…" : ""}`;
}

function getScenarioStepBadgeStyle(status: "pending" | "running" | "done" | "error") {
  if (status === "done") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "running") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "error") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function DemoWorkspace({
  demo,
  title,
  subtitle,
  suggestions,
  scenarios = [],
  initialQueue,
  initialPlan,
  initialTasks,
  initialArtifacts,
  initialCitations = [],
  enableVoice = false,
  enableTts = false,
  topPanel,
  bottomPanel,
}: DemoWorkspaceProps) {
  const [viewMode, setViewMode] = useState<"guided" | "full">("guided");
  const [provider, setProvider] = useState<ModelProvider>("openai");
  const [model, setModel] = useState(getDefaultModel("openai"));
  const [meetingProfileId] = useState("auto-any");
  const [draft, setDraft] = useState("");
  const [meetingTranscript, setMeetingTranscript] = useState("");
  const [isTranscriptEditing, setIsTranscriptEditing] = useState(true);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [plan, setPlan] = useState<PlanStep[]>(initialPlan);
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>(initialArtifacts);
  const [tools, setTools] = useState<ToolEvent[]>([]);
  const [citations, setCitations] = useState<CitationItem[]>(initialCitations);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState(initialArtifacts[0]?.id ?? "");
  const [artifactViewMode, setArtifactViewMode] = useState<"rendered" | "raw">("rendered");
  const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "error">("idle");
  const [ttsVoice, setTtsVoice] = useState("ja-JP-default");
  const [ttsNote, setTtsNote] = useState<string | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null);
  const [scenarioStepStates, setScenarioStepStates] = useState<
    Record<string, Record<string, "pending" | "running" | "done" | "error">>
  >({});
  const [scenarioDurations, setScenarioDurations] = useState<Record<string, number>>({});
  const [scenarioElapsedSec, setScenarioElapsedSec] = useState(0);
  const [approvalLogs, setApprovalLogs] = useState<ApprovalLogItem[]>([]);
  const [activeApprovalLogId, setActiveApprovalLogId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<
    Array<Pick<DemoSessionSnapshot, "id" | "title" | "updatedAt" | "modelProvider" | "modelId">>
  >([]);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<string | null>(null);
  const [providerHint, setProviderHint] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [loopStatus, setLoopStatus] = useState<string | null>(null);
  const [meetingDetailRailOpen, setMeetingDetailRailOpen] = useState(false);
  const [structuredInsight, setStructuredInsight] = useState<StructuredInsight | null>(null);
  const [thinkingSidebarOpen, setThinkingSidebarOpen] = useState(false);

  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const scenarioAbortRef = useRef(false);
  const scenarioStartRef = useRef<number | null>(null);

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    error,
  } = useChat<DemoUIMessage>({
    transport: new DefaultChatTransport<DemoUIMessage>({
      api: "/api/chat",
    }),
    onData(dataPart) {
      const part = dataPart as unknown as {
        type: string;
        data: unknown;
      };

      if (part.type === "data-queue") {
        setQueue((prev) => upsertById(prev, part.data as QueueItem));
        return;
      }

      if (part.type === "data-plan") {
        const payload = part.data as { steps: PlanStep[] };
        setPlan(payload.steps);
        return;
      }

      if (part.type === "data-task") {
        const payload = part.data as { items: TaskItem[] };
        setTasks(payload.items);
        return;
      }

      if (part.type === "data-artifact") {
        const artifact = part.data as ArtifactItem;
        setArtifacts((prev) => upsertById(prev, artifact));
        setSelectedArtifactId((prev) => prev || artifact.id);
        return;
      }

      if (part.type === "data-tool") {
        const toolEvent = part.data as ToolEvent;
        setTools((prev) => upsertById(prev, toolEvent));
        if (toolEvent.name === "model-call" && toolEvent.status === "running") {
          setStructuredInsight(null);
        }
        return;
      }

      if (part.type === "data-approval") {
        const nextApproval = part.data as ApprovalRequest;
        setApproval(nextApproval);

        if (nextApproval.required) {
          const logId = crypto.randomUUID();
          setApprovalLogs((prev) =>
            [
              {
                id: logId,
                action: nextApproval.action,
                reason: nextApproval.reason,
                status: "pending" as const,
                timestamp: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 10),
          );
          setActiveApprovalLogId(logId);
        }
        return;
      }

      if (part.type === "data-citation") {
        setCitations((prev) => upsertById(prev, part.data as CitationItem));
        return;
      }

      if (part.type === "data-structured") {
        setStructuredInsight(part.data as StructuredInsight);
      }
    },
  });

  useEffect(() => {
    setModel(getDefaultModel(provider));
  }, [provider]);

  useEffect(() => {
    setSelectedArtifactId((current) => {
      if (current && artifacts.some((artifact) => artifact.id === current)) {
        return current;
      }

      return artifacts[0]?.id ?? "";
    });
  }, [artifacts]);

  useEffect(() => {
    if (!runningScenarioId || !scenarioStartRef.current) {
      return;
    }

    const timerId = window.setInterval(() => {
      if (!scenarioStartRef.current) {
        return;
      }

      setScenarioElapsedSec(Math.floor((Date.now() - scenarioStartRef.current) / 1000));
    }, 250);

    return () => window.clearInterval(timerId);
  }, [runningScenarioId]);

  useEffect(() => {
    let active = true;

    const loadRuntimeInfo = async () => {
      try {
        const response = await fetch("/api/runtime");
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        const payload = (await response.json()) as RuntimeInfo;
        if (!active) {
          return;
        }
        setRuntimeInfo(payload);
        setRuntimeStatus(null);
      } catch {
        if (!active) {
          return;
        }
        setRuntimeStatus("runtime情報の取得に失敗しました。");
      }
    };

    void loadRuntimeInfo();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!runtimeInfo) {
      return;
    }

    if (!runtimeInfo.hasOpenAIKey && runtimeInfo.hasGeminiKey && provider === "openai") {
      setProvider("gemini");
      setProviderHint("OpenAIキー未設定のため、Geminiへ自動切替しました。");
      return;
    }

    if (!runtimeInfo.hasGeminiKey && runtimeInfo.hasOpenAIKey && provider === "gemini") {
      setProvider("openai");
      setProviderHint("Geminiキー未設定のため、OpenAIへ自動切替しました。");
      return;
    }

    if (!runtimeInfo.hasOpenAIKey && !runtimeInfo.hasGeminiKey) {
      setProviderHint("OpenAI/GeminiのAPIキーが未設定です。Settingsで設定してください。");
      return;
    }

    setProviderHint(null);
  }, [provider, runtimeInfo]);

  useEffect(() => {
    if (demo !== "meeting") {
      setMeetingDetailRailOpen(true);
      return;
    }

    setMeetingDetailRailOpen(false);
  }, [demo]);

  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[0],
    [artifacts, selectedArtifactId],
  );
  const selectedMeetingProfile = useMemo(
    () => MEETING_PROFILES.find((profile) => profile.id === meetingProfileId) ?? MEETING_PROFILES[0],
    [meetingProfileId],
  );
  const selectedMeetingSample = useMemo(
    () =>
      meetingTranscriptSamples.find((sample) => sample.meetingProfileId === "sales-weekly") ??
      meetingTranscriptSamples[0] ??
      null,
    [],
  );
  const activeSuggestions = useMemo(
    () => (demo === "meeting" ? getMeetingSuggestions(selectedMeetingProfile) : suggestions),
    [demo, selectedMeetingProfile, suggestions],
  );
  const activeScenarios = useMemo(
    () => (demo === "meeting" ? [buildMeetingScenario(selectedMeetingProfile)] : scenarios),
    [demo, selectedMeetingProfile, scenarios],
  );
  const displayedSuggestions = useMemo(
    () => (viewMode === "guided" ? activeSuggestions.slice(0, 2) : activeSuggestions),
    [activeSuggestions, viewMode],
  );
  const meetingTranscriptReady = useMemo(
    () => hasRequiredMeetingTranscript(meetingTranscript),
    [meetingTranscript],
  );
  useEffect(() => {
    if (!meetingTranscriptReady) {
      setIsTranscriptEditing(true);
    }
  }, [meetingTranscriptReady]);
  const meetingTranscriptConfirmed = meetingTranscriptReady && !isTranscriptEditing;
  const meetingPrerequisiteBlocked = demo === "meeting" && !meetingTranscriptConfirmed;
  const hasConversationStarted = messages.length > 0;
  const isChatFocusedDemo = demo === "meeting" || demo === "research";
  const showMeetingPrimaryRail = !isChatFocusedDemo;
  const showMeetingSetupCard = demo === "meeting" && (!meetingTranscriptConfirmed || isTranscriptEditing);
  const showMeetingTranscriptSummaryBar = demo === "meeting" && meetingTranscriptConfirmed && !isTranscriptEditing;
  const showMeetingRuntimeSummary = demo === "meeting" && meetingTranscriptConfirmed && hasConversationStarted;
  const showMeetingRuntimePanels =
    viewMode === "full" && (demo !== "meeting" || showMeetingRuntimeSummary);
  const showPrimaryChatWorkspace = demo !== "meeting" || meetingTranscriptConfirmed;
  const showStickySummary = isChatFocusedDemo && hasConversationStarted;
  const transcriptHeadline = useMemo(() => {
    if (structuredInsight?.headline?.trim()) {
      return structuredInsight.headline.trim();
    }

    return deriveTranscriptHeadline({
      transcript: meetingTranscript,
      profileLabel: selectedMeetingProfile.label,
    });
  }, [meetingTranscript, selectedMeetingProfile.label, structuredInsight?.headline]);
  const transcriptStats = useMemo(
    () => ({
      chars: meetingTranscript.length,
      lines: meetingTranscript.trim().length === 0 ? 0 : meetingTranscript.split("\n").length,
    }),
    [meetingTranscript],
  );
  const transcriptPreview = useMemo(() => {
    const compact = meetingTranscript
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return compact.slice(0, 180);
  }, [meetingTranscript]);

  const contextStats = useMemo(() => {
    const userText = messages
      .filter((message) => message.role === "user")
      .map(getMessageText)
      .join("\n");

    const assistantText = messages
      .filter((message) => message.role === "assistant")
      .map(getMessageText)
      .join("\n");

    const inputTokens = estimateTokenCount(userText);
    const outputTokens = estimateTokenCount(assistantText);

    return {
      inputTokens,
      outputTokens,
      costUsd: estimateCostUsd({ provider, inputTokens, outputTokens }),
    };
  }, [messages, provider]);
  const hasAssistantResponse = useMemo(
    () =>
      messages.some(
        (message) => message.role === "assistant" && getMessageText(message).length > 0,
      ),
    [messages],
  );
  const shouldShowArtifacts = artifacts.length > 0 && hasAssistantResponse;
  const selectedProviderLabel = provider === "openai" ? "OpenAI" : "Gemini";
  const selectedProviderKeyLabel =
    provider === "openai" ? "OPENAI_API_KEY" : "GOOGLE_GENERATIVE_AI_API_KEY";
  const selectedProviderConfigured = provider === "openai"
    ? runtimeInfo?.hasOpenAIKey
    : runtimeInfo?.hasGeminiKey;
  const alternateProviderConfigured = provider === "openai"
    ? runtimeInfo?.hasGeminiKey
    : runtimeInfo?.hasOpenAIKey;

  const queueSummary = useMemo(
    () =>
      queue.reduce(
        (summary, item) => {
          if (item.severity === "critical") {
            summary.critical += 1;
          } else if (item.severity === "warning") {
            summary.warning += 1;
          } else {
            summary.info += 1;
          }
          return summary;
        },
        { info: 0, warning: 0, critical: 0 },
      ),
    [queue],
  );

  const displayedScenarios = useMemo(
    () => (viewMode === "guided" ? activeScenarios.slice(0, 1) : activeScenarios),
    [activeScenarios, viewMode],
  );
  const latestAssistantSummary = useMemo(() => {
    if (structuredInsight) {
      return {
        summary: structuredInsight.summary,
        bullets: structuredInsight.keyPoints.slice(0, 3),
      };
    }

    return extractLatestAssistantSummary(messages);
  }, [messages, structuredInsight]);
  const conversationFollowKey = useMemo(() => {
    const latestMessage = messages.at(-1);
    const latestTextLength = latestMessage ? getMessageText(latestMessage).length : 0;
    return `${messages.length}:${latestMessage?.id ?? "none"}:${latestTextLength}:${status}:${tools.length}`;
  }, [messages, status, tools.length]);
  const assumptionHints = useMemo(() => {
    if (!structuredInsight) {
      return [] as string[];
    }

    const fromEvidence = structuredInsight.evidence
      .map((item) => item.claim.trim())
      .filter((item) => item.length > 0);
    const fromRisks = structuredInsight.risks
      .map((risk) => `${risk.title}: ${risk.impact}`.trim())
      .filter((item) => item.length > 0);

    return [...fromEvidence, ...fromRisks].slice(0, 3);
  }, [structuredInsight]);
  const meetingFollowUpSuggestions = useMemo(() => {
    if (demo !== "meeting" || !meetingTranscriptConfirmed) {
      return [] as string[];
    }

    const generated: string[] = [];

    if (structuredInsight) {
      const firstRisk = structuredInsight.risks[0];
      if (firstRisk) {
        generated.push(`「${firstRisk.title}」の早期検知シグナルを3つに分解して`);
      }

      const firstAction = structuredInsight.actions[0];
      if (firstAction) {
        generated.push(
          `${firstAction.owner}向けに、今日中に着手するチェックリストを5項目で作って`,
        );
      }

      if (structuredInsight.evidence[0]) {
        generated.push("不足データの回収順を、影響度順で並べ替えて");
      }
    }

    if (latestAssistantSummary?.summary) {
      generated.push("この会議レビューを、経営向け共有文（200字）に圧縮して");
      generated.push("未決事項だけ抜き出して、次回会議アジェンダ案にして");
    } else {
      generated.push("この議事録の決定事項と未決事項を3行で整理して");
      generated.push("失敗シナリオを2件に絞って先に提示して");
      generated.push("次回会議までの担当付きアクションを表で作って");
    }

    return Array.from(new Set(generated)).slice(0, 5);
  }, [demo, latestAssistantSummary?.summary, meetingTranscriptConfirmed, structuredInsight]);
  const inputSuggestions = useMemo(
    () => (demo === "meeting" ? meetingFollowUpSuggestions : displayedSuggestions.slice(0, 5)),
    [demo, displayedSuggestions, meetingFollowUpSuggestions],
  );
  const meetingDecisionTimeline = useMemo<MeetingTimelineEntry[]>(() => {
    if (demo !== "meeting" || !structuredInsight) {
      return [];
    }

    const items: MeetingTimelineEntry[] = [
      ...structuredInsight.keyPoints.slice(0, 2).map((point, index) => ({
        id: `decision-${index + 1}`,
        phase: "会議中",
        title: point,
        detail: "議事録で確認された主要論点",
        status: "complete" as const,
      })),
      ...structuredInsight.actions.slice(0, 4).map((action, index) => {
        const matchedTask = tasks.find((task) => task.label.includes(action.task));
        const status: MeetingTimelineEntry["status"] = matchedTask?.done
          ? "complete"
          : index === 0
            ? "active"
            : "pending";

        return {
          id: `action-${index + 1}`,
          phase: action.due?.trim() || "次回まで",
          title: action.task,
          detail: `${action.owner} / 成功条件: ${action.metric}`,
          status,
        };
      }),
    ];

    return items.slice(0, 6);
  }, [demo, structuredInsight, tasks]);
  const primaryScenario = useMemo(() => activeScenarios[0] ?? null, [activeScenarios]);

  const planProgress = useMemo(() => {
    if (plan.length === 0) {
      return 0;
    }

    const doneCount = plan.filter((step) => step.status === "done").length;
    return Math.round((doneCount / plan.length) * 100);
  }, [plan]);

  const taskProgress = useMemo(() => {
    if (tasks.length === 0) {
      return 0;
    }

    const doneCount = tasks.filter((task) => task.done).length;
    return Math.round((doneCount / tasks.length) * 100);
  }, [tasks]);

  const stageGates = useMemo(
    () => [
      {
        id: "input",
        label: "Input",
        done: messages.some((message) => message.role === "user"),
      },
      {
        id: "progress",
        label: "Progress",
        done: plan.length > 0 || tasks.length > 0 || tools.length > 0,
      },
      {
        id: "artifact",
        label: "Artifact",
        done: artifacts.length > 0,
      },
      {
        id: "iteration",
        label: "Iteration",
        done:
          checkpoints.length > 0 ||
          tools.length >= 2 ||
          messages.filter((message) => message.role === "assistant").length >= 2,
      },
    ],
    [messages, plan.length, tasks.length, tools.length, artifacts.length, checkpoints.length],
  );
  const completedGateCount = stageGates.filter((stage) => stage.done).length;
  const gateProgress = Math.round((completedGateCount / stageGates.length) * 100);
  const worklogSteps = useMemo<WorklogStep[]>(() => {
    if (structuredInsight && structuredInsight.worklog.length > 0) {
      return structuredInsight.worklog.slice(0, 6).map((step) => ({
        id: step.id,
        label: step.label,
        description: step.detail,
        status: toWorklogStatus(step.status),
        tags: step.tags.length > 0 ? step.tags : [step.status],
      }));
    }

    if (plan.length > 0) {
      return plan.slice(0, 4).map((step, index) => {
        const relatedTool = tools.find((tool) => tool.detail.includes(step.title));
        const fallbackDescription =
          step.status === "done"
            ? "このステップは完了済みです。"
            : step.status === "doing"
              ? "このステップを現在実行中です。"
              : "このステップは次の実行候補です。";

        return {
          id: step.id,
          label: step.title,
          description: relatedTool?.detail ?? fallbackDescription,
          status: toWorklogStatus(step.status),
          tags: [`step ${index + 1}`, step.status],
        };
      });
    }

    return stageGates.map((stage, index) => ({
      id: stage.id,
      label: stage.label,
      description: stage.done
        ? `${stage.label}は完了しています。`
        : `${stage.label}はこれから実行されます。`,
      status: stage.done ? "complete" : index === completedGateCount ? "active" : "pending",
      tags: ["workflow", stage.done ? "done" : "waiting"],
    }));
  }, [completedGateCount, plan, stageGates, structuredInsight, tools]);
  const isStreaming = status === "streaming" || status === "submitted";
  const latestToolEvents = useMemo(() => tools.slice(0, 10), [tools]);
  const runningToolCount = useMemo(
    () => tools.filter((tool) => tool.status === "running").length,
    [tools],
  );
  const connectorCompleted = useMemo(
    () =>
      tools.some(
        (tool) =>
          tool.status === "success" &&
          (tool.name.includes("connector") || tool.name === "connector-fetch"),
      ),
    [tools],
  );
  const microAgentProgress = useMemo(() => {
    const branchEvents = tools.filter((tool) => tool.name.startsWith("branch-"));
    const branchDone = branchEvents.filter((tool) => tool.status === "success").length;
    const branchRunning = branchEvents.filter((tool) => tool.status === "running").length;
    const branchError = branchEvents.filter((tool) => tool.status === "error").length;
    return {
      total: branchEvents.length,
      done: branchDone,
      running: branchRunning,
      error: branchError,
    };
  }, [tools]);
  const reasoningTraceMarkdown = useMemo(() => {
    const lines: string[] = [
      "### 観測",
      connectorCompleted
        ? "- 外部コネクタで公開データを取得済み。"
        : "- 外部コネクタの結果待ち、または未取得。",
      "",
      "### 推論",
      ...worklogSteps.slice(0, 3).map((step) => `- ${step.label}: ${compactUiText(step.description, 92)}`),
      "",
      "### 実行ログ",
      ...latestToolEvents
        .slice(0, 5)
        .map((tool) => `- ${tool.name} [${tool.status}] ${compactUiText(tool.detail, 92)}`),
    ];

    if (structuredInsight?.summary) {
      lines.push("", `### 集約`, `- ${compactUiText(structuredInsight.summary, 120)}`);
    }

    return lines.join("\n");
  }, [connectorCompleted, latestToolEvents, structuredInsight?.summary, worklogSteps]);
  const liveAgentSteps = useMemo<LiveAgentStep[]>(() => {
    if (demo !== "meeting") {
      return [];
    }

    const connectorSuccess = findLatestToolEvent(
      tools,
      (tool) => tool.status === "success" && tool.name.includes("connector"),
    );
    const connectorRunning = findLatestToolEvent(
      tools,
      (tool) => tool.name === "connector-fetch" && tool.status === "running",
    );
    const connectorError = findLatestToolEvent(
      tools,
      (tool) => tool.name === "connector-fetch" && tool.status === "error",
    );

    const modelDone = findLatestToolEvent(
      tools,
      (tool) => tool.name === "model-call" && tool.status === "success",
    );
    const modelRunning = findLatestToolEvent(
      tools,
      (tool) => tool.name === "model-call" && tool.status === "running",
    );

    const orchestrationDone = findLatestToolEvent(
      tools,
      (tool) => tool.name === "multi-agent-orchestration" && tool.status === "success",
    );
    const orchestrationRunning = findLatestToolEvent(
      tools,
      (tool) => tool.name === "multi-agent-orchestration" && tool.status === "running",
    );
    const orchestrationError = findLatestToolEvent(
      tools,
      (tool) => tool.name === "multi-agent-orchestration" && tool.status === "error",
    );

    const structuredDone = findLatestToolEvent(
      tools,
      (tool) => tool.name === "structured-output" && tool.status === "success",
    );
    const structuredRunning = findLatestToolEvent(
      tools,
      (tool) => tool.name === "structured-output" && tool.status === "running",
    );
    const structuredError = findLatestToolEvent(
      tools,
      (tool) => tool.name === "structured-output" && tool.status === "error",
    );

    return [
      {
        id: "live-intake",
        label: "入力確定",
        detail: meetingTranscriptConfirmed ? "議事録を確認済み。" : "議事録入力待ち。",
        status: meetingTranscriptConfirmed ? "done" : "todo",
      },
      {
        id: "live-collect",
        label: "外部収集",
        detail:
          connectorSuccess?.detail ??
          connectorRunning?.detail ??
          connectorError?.detail ??
          "公開データの収集を待機中。",
        status: connectorSuccess ? "done" : connectorRunning ? "doing" : "todo",
      },
      {
        id: "live-reason",
        label: "一次推論",
        detail:
          modelDone?.detail ??
          modelRunning?.detail ??
          "会議レビュー回答を生成します。",
        status: modelDone ? "done" : modelRunning ? "doing" : "todo",
      },
      {
        id: "live-branch",
        label: "並列検証",
        detail:
          orchestrationDone?.detail ??
          orchestrationRunning?.detail ??
          orchestrationError?.detail ??
          "Observer / Skeptic / Operator を待機中。",
        status: orchestrationDone ? "done" : orchestrationRunning ? "doing" : "todo",
      },
      {
        id: "live-aggregate",
        label: "構造化集約",
        detail:
          structuredDone?.detail ??
          structuredRunning?.detail ??
          structuredError?.detail ??
          "TL;DR / 論点 / 次アクションを整形します。",
        status: structuredDone ? "done" : structuredRunning ? "doing" : "todo",
      },
    ];
  }, [demo, meetingTranscriptConfirmed, tools]);
  const liveAgentCurrentStepLabel = useMemo(() => {
    const active = liveAgentSteps.find((step) => step.status === "doing");
    if (active) {
      return active.label;
    }

    const pending = liveAgentSteps.find((step) => step.status === "todo");
    if (pending) {
      return pending.label;
    }

    return liveAgentSteps.at(-1)?.label ?? "完了";
  }, [liveAgentSteps]);
  const currentRunningTool = useMemo(
    () => latestToolEvents.find((tool) => tool.status === "running") ?? null,
    [latestToolEvents],
  );
  const streamingStatusLabel = useMemo(() => {
    if (!isStreaming) {
      return "ready";
    }
    if (demo === "meeting" && showMeetingRuntimeSummary) {
      return `回答を生成しています...（${liveAgentCurrentStepLabel}）`;
    }
    if (currentRunningTool) {
      return `${currentRunningTool.name}: ${compactUiText(currentRunningTool.detail, 56)}`;
    }
    return "回答を生成しています...";
  }, [currentRunningTool, demo, isStreaming, liveAgentCurrentStepLabel, showMeetingRuntimeSummary]);
  const agenticLanes = useMemo<AgenticLane[]>(() => {
    const observeState: AgenticLane["state"] =
      demo === "meeting"
        ? meetingTranscriptConfirmed
          ? "done"
          : runningToolCount > 0
            ? "doing"
            : "todo"
        : connectorCompleted
          ? "done"
          : runningToolCount > 0
            ? "doing"
            : "todo";

    const reasonState: AgenticLane["state"] = structuredInsight
      ? "done"
      : isStreaming || microAgentProgress.running > 0
        ? "doing"
        : "todo";

    const doneTasks = tasks.filter((task) => task.done).length;
    const actState: AgenticLane["state"] =
      tasks.length === 0
        ? microAgentProgress.done > 0
          ? "doing"
          : "todo"
        : doneTasks === tasks.length
          ? "done"
          : doneTasks > 0 || microAgentProgress.running > 0
            ? "doing"
            : "todo";

    return [
      {
        id: "observe",
        label: "観測",
        state: observeState,
        detail:
          demo === "meeting"
            ? meetingTranscriptConfirmed
              ? "議事録確定"
              : "議事録待ち"
            : connectorCompleted
              ? "外部データ取得済み"
              : "データ収集中",
      },
      {
        id: "reason",
        label: "推論",
        state: reasonState,
        detail: structuredInsight ? "構造化済み" : isStreaming ? "解析中" : "未実行",
      },
      {
        id: "act",
        label: "実行",
        state: actState,
        detail:
          tasks.length > 0
            ? `${doneTasks}/${tasks.length} tasks`
            : `${microAgentProgress.done} branch done`,
      },
      {
        id: "intervene",
        label: "介入",
        state: approval?.required ? "doing" : "done",
        detail: approval?.required ? "承認待ち" : "自動継続",
      },
    ];
  }, [
    approval?.required,
    connectorCompleted,
    demo,
    isStreaming,
    meetingTranscriptConfirmed,
    microAgentProgress.done,
    microAgentProgress.running,
    runningToolCount,
    structuredInsight,
    tasks,
  ]);

  const withDemoContext = useCallback((rawText: string) => rawText.trim(), []);

  const meetingSystemContext = useMemo(() => {
    if (demo !== "meeting") {
      return "";
    }

    const profileHint =
      selectedMeetingProfile.id === "auto-any"
        ? "会議タイプ: 議事録から自動推定"
        : `会議タイプ: ${selectedMeetingProfile.label}`;

    return (
      "会議設定:\n" +
      `- ${profileHint}\n` +
      "- ガイド原則: 会議の速度ではなく、合意形成と実行確度を上げる\n" +
      `- 目的: ${selectedMeetingProfile.objective}\n` +
      `- 参加者: ${selectedMeetingProfile.participants}\n` +
      `- 期待成果: ${selectedMeetingProfile.expectedOutput}\n` +
      `- 主要論点: ${selectedMeetingProfile.keyTopics.join(" / ")}\n` +
      `${buildMeetingOutputFormatInstruction(selectedMeetingProfile)}\n` +
      "必ず見出し付きで出力し、次アクション表は Markdown table で記述してください。"
    );
  }, [demo, selectedMeetingProfile]);

  const buildRequestBody = useCallback(
    (options?: {
      approved?: boolean;
      operation?: "default" | "devils-advocate" | "autonomous-loop" | "scenario";
      meetingLog?: string;
    }) => ({
      demo,
      provider,
      model,
      approved: options?.approved ?? false,
      ...(options?.operation ? { operation: options.operation } : {}),
      ...(demo === "meeting"
        ? {
            meetingContext: meetingSystemContext,
            meetingProfileId: selectedMeetingProfile.id,
            meetingLog: (options?.meetingLog ?? meetingTranscript).trim(),
          }
        : {}),
    }),
    [
      demo,
      meetingTranscript,
      meetingSystemContext,
      model,
      provider,
      selectedMeetingProfile.id,
    ],
  );

  const ensureMeetingTranscript = useCallback(
    (actionLabel: string) => {
      if (demo !== "meeting") {
        return true;
      }
      if (meetingTranscriptConfirmed) {
        return true;
      }

      setLoopStatus(
        `${actionLabel}の前に Step 1 で議事録を入力し「議事録を確定」を押してください（20文字以上）。`,
      );
      return false;
    },
    [demo, meetingTranscriptConfirmed],
  );

  const send = async () => {
    if (!ensureMeetingTranscript("送信")) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const finalText = attachmentNames.length
      ? `${trimmed}\n\n添付ファイル: ${attachmentNames.join(", ")}`
      : trimmed;
    const contextualText = withDemoContext(finalText);
    if (!contextualText) {
      return;
    }

    await sendMessage(
      { text: contextualText },
      {
        body: buildRequestBody({ approved: false, operation: "default" }),
      },
    );

    setDraft("");
    setAttachmentNames([]);
  };

  const sendFollowUpSuggestion = async (suggestion: string) => {
    if (isStreaming || meetingPrerequisiteBlocked) {
      return;
    }

    const prompt = withDemoContext(suggestion);
    if (!prompt) {
      return;
    }

    await sendMessage(
      { text: prompt },
      {
        body: buildRequestBody({ approved: false, operation: "default" }),
      },
    );

    setLoopStatus(`提案質問を送信しました: ${compactUiText(suggestion, 48)}`);
  };

  const runDevilsAdvocate = async (options?: {
    meetingLogOverride?: string;
    notesOverride?: string;
    statusNote?: string;
  }) => {
    if (isStreaming) {
      return;
    }

    const transcript = buildConversationTranscript(messages);
    const meetingLog = (options?.meetingLogOverride ?? meetingTranscript).trim();
    if (demo === "meeting" && !hasRequiredMeetingTranscript(meetingLog)) {
      setLoopStatus(
        "反証レビューの前に Step 1 で議事録を入力し、確定してください（20文字以上）。",
      );
      return;
    }

    const notes = (options?.notesOverride ?? draft).trim();

    const promptSections = [
      "悪魔の代弁者レビューを実行してください。",
      notes ? `追加メモ:\n${notes}` : "",
      meetingLog
        ? "会議ログを参照して、前提の穴を優先して指摘してください。"
        : transcript
          ? "会話ログをもとにレビューしてください。"
          : "会話が空なので、一般的な失敗前提でレビューしてください。",
    ].filter(Boolean);
    const contextualPrompt = withDemoContext(promptSections.join("\n\n"));
    if (!contextualPrompt) {
      return;
    }

    await sendMessage(
      { text: contextualPrompt },
      {
        body: buildRequestBody({
          approved: false,
          operation: "devils-advocate",
          meetingLog: meetingLog || transcript || undefined,
        }),
      },
    );

    setLoopStatus(options?.statusNote ?? "悪魔の代弁者レビューを実行しました。");
  };

  const loadMeetingSample = () => {
    if (!selectedMeetingSample) {
      setLoopStatus("サンプル議事録が見つかりませんでした。");
      return;
    }

    setMeetingTranscript(selectedMeetingSample.dirtyTranscript);
    setIsTranscriptEditing(false);
    setDraft(selectedMeetingSample.note);
    setLoopStatus(`サンプル「${selectedMeetingSample.title}」を読み込みました。`);
  };

  const runScenario = async (scenario: DemoScenario) => {
    if (runningScenarioId) {
      return;
    }

    if (!ensureMeetingTranscript("シナリオ実行")) {
      return;
    }

    scenarioAbortRef.current = false;
    scenarioStartRef.current = Date.now();
    setScenarioElapsedSec(0);
    setRunningScenarioId(scenario.id);
    setScenarioStatus(`シナリオ「${scenario.title}」を実行中...`);
    setScenarioStepStates((prev) => ({
      ...prev,
      [scenario.id]: Object.fromEntries(scenario.steps.map((step) => [step.id, "pending"])),
    }));

    try {
      for (const [index, step] of scenario.steps.entries()) {
        if (scenarioAbortRef.current) {
          setScenarioStatus(`シナリオ「${scenario.title}」を停止しました。`);
          break;
        }

        setScenarioStatus(
          `シナリオ実行中 (${index + 1}/${scenario.steps.length}): ${step.label}`,
        );
        setScenarioStepStates((prev) => ({
          ...prev,
          [scenario.id]: {
            ...prev[scenario.id],
            [step.id]: "running",
          },
        }));

        await sendMessage(
          { text: withDemoContext(step.prompt) },
          {
            body: buildRequestBody({
              approved: step.approved ?? false,
              operation: "scenario",
              meetingLog:
                demo === "meeting"
                  ? meetingTranscript.trim() || buildConversationTranscript(messages) || undefined
                  : undefined,
            }),
          },
        );

        setScenarioStepStates((prev) => ({
          ...prev,
          [scenario.id]: {
            ...prev[scenario.id],
            [step.id]: "done",
          },
        }));
        await wait(240);
      }

      if (!scenarioAbortRef.current) {
        setScenarioStatus(`シナリオ「${scenario.title}」が完了しました。`);
      }
    } catch (scenarioError) {
      setScenarioStepStates((prev) => {
        const current = prev[scenario.id];
        if (!current) {
          return prev;
        }

        const runningStepId = Object.entries(current).find(([, state]) => state === "running")?.[0];
        if (!runningStepId) {
          return prev;
        }

        return {
          ...prev,
          [scenario.id]: {
            ...current,
            [runningStepId]: "error",
          },
        };
      });
      setScenarioStatus(
        `シナリオ実行に失敗しました: ${
          scenarioError instanceof Error ? scenarioError.message : "unknown error"
        }`,
      );
    } finally {
      const startedAt = scenarioStartRef.current;
      if (startedAt) {
        const elapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
        setScenarioDurations((prev) => ({ ...prev, [scenario.id]: elapsed }));
      }

      scenarioStartRef.current = null;
      scenarioAbortRef.current = false;
      setRunningScenarioId(null);
    }
  };

  const stopScenario = () => {
    if (!runningScenarioId) {
      return;
    }

    scenarioAbortRef.current = true;
    setScenarioStatus("停止要求を受け付けました。現在のステップ終了後に停止します。");
  };

  const approveCurrentAction = async () => {
    if (!approval?.required) {
      return;
    }

    await sendMessage(
      {
        text: `承認: ${approval.action}`,
      },
      {
        body: buildRequestBody({ approved: true, operation: "default" }),
      },
    );

    if (activeApprovalLogId) {
      setApprovalLogs((prev) =>
        prev.map((log) =>
          log.id === activeApprovalLogId ? { ...log, status: "approved" } : log,
        ),
      );
      setActiveApprovalLogId(null);
    }

    setApproval(null);
  };

  const dismissCurrentAction = () => {
    if (activeApprovalLogId) {
      setApprovalLogs((prev) =>
        prev.map((log) =>
          log.id === activeApprovalLogId ? { ...log, status: "dismissed" } : log,
        ),
      );
      setActiveApprovalLogId(null);
    }

    setApproval(null);
  };

  const createCheckpoint = () => {
    const checkpoint: Checkpoint = {
      id: crypto.randomUUID(),
      label: new Date().toLocaleTimeString("ja-JP"),
      messages,
      queue,
      plan,
      tasks,
      artifacts,
      tools,
      citations,
      structuredInsight,
    };

    setCheckpoints((prev) => [checkpoint, ...prev].slice(0, 6));
  };

  const restoreCheckpoint = (checkpoint: Checkpoint) => {
    setMessages(checkpoint.messages);
    setQueue(checkpoint.queue);
    setPlan(checkpoint.plan);
    setTasks(checkpoint.tasks);
    setArtifacts(checkpoint.artifacts);
    setTools(checkpoint.tools);
    setCitations(checkpoint.citations);
    setStructuredInsight(checkpoint.structuredInsight ?? null);
  };

  const handleDraftKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void send();
      return;
    }

    if (event.key === "Escape" && isStreaming) {
      event.preventDefault();
      stop();
    }
  };

  const startVoiceInput = () => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceStatus("error");
      setDraft((prev) => `${prev}\n現場音声メモ（fallback）: 2階東側で配筋、午後は型枠補修。`);
      return;
    }

    const recognition = new (SpeechRecognitionCtor as new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    })();

    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");

      setDraft((prev) => `${prev}\n${transcript}`.trim());
    };
    recognition.onerror = () => {
      setVoiceStatus("error");
    };
    recognition.onend = () => {
      setVoiceStatus("idle");
    };

    recognitionRef.current = recognition;
    setVoiceStatus("listening");
    recognition.start();
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setVoiceStatus("idle");
  };

  const previewTts = async () => {
    const text = draft.trim() || "駅構内放送のテストです。中央線快速は遅延しています。";

    const response = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voice: ttsVoice }),
    });

    const payload = (await response.json()) as { note?: string };
    setTtsNote(payload.note ?? "TTS preview completed.");

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files) {
      setAttachmentNames([]);
      return;
    }

    setAttachmentNames(Array.from(files).map((file) => file.name));
  };

  const copyArtifact = async () => {
    if (!selectedArtifact) {
      return;
    }

    await navigator.clipboard.writeText(selectedArtifact.content);
    setCopiedArtifactId(selectedArtifact.id);
    window.setTimeout(() => {
      setCopiedArtifactId((current) => (current === selectedArtifact.id ? null : current));
    }, 1200);
  };

  const downloadArtifact = () => {
    if (!selectedArtifact) {
      return;
    }

    const blob = new Blob([selectedArtifact.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = selectedArtifact.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions?demo=${demo}&limit=6`);
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const payload = (await response.json()) as {
        sessions: Array<
          Pick<DemoSessionSnapshot, "id" | "title" | "updatedAt" | "modelProvider" | "modelId">
        >;
      };
      setSessions(payload.sessions ?? []);
    } catch {
      setSessionStatus("セッション一覧の取得に失敗しました。");
    }
  }, [demo]);

  const saveSession = async () => {
    setSessionStatus(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          demo,
          title: `${title} ${new Date().toLocaleString("ja-JP")}`,
          modelProvider: provider,
          modelId: model,
          messages,
          queue,
          plan,
          tasks,
          artifacts,
          tools,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "save failed");
      }

      setSessionStatus("セッションを保存しました。");
      await loadSessions();
    } catch (saveError) {
      setSessionStatus(
        `セッション保存に失敗しました: ${
          saveError instanceof Error ? saveError.message : "unknown error"
        }`,
      );
    }
  };

  const restoreSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const payload = (await response.json()) as { session: DemoSessionSnapshot };
      const session = payload.session;

      setProvider(session.modelProvider);
      setModel(session.modelId);
      setMessages(session.messages);
      setQueue(session.queue);
      setPlan(session.plan);
      setTasks(session.tasks);
      setArtifacts(session.artifacts);
      setTools(session.tools);
      setSessionStatus(`セッション ${session.title} を復元しました。`);
    } catch (restoreError) {
      setSessionStatus(
        `セッション復元に失敗しました: ${
          restoreError instanceof Error ? restoreError.message : "unknown error"
        }`,
      );
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const showDetailRail =
    viewMode === "full" &&
    (demo === "meeting"
      ? meetingDetailRailOpen
      : !isChatFocusedDemo);

  const workspaceGridClass = cn("grid gap-4", {
    "xl:grid-cols-[280px_minmax(0,1fr)]":
      showMeetingPrimaryRail && viewMode === "guided",
    "xl:grid-cols-[280px_minmax(0,1fr)_360px]":
      showMeetingPrimaryRail && viewMode === "full",
    "xl:grid-cols-[minmax(0,1fr)]":
      !showMeetingPrimaryRail && !showDetailRail,
    "xl:grid-cols-[minmax(0,1fr)_360px]":
      !showMeetingPrimaryRail && showDetailRail && viewMode === "full",
  });
  const chatSectionClass = cn("space-y-4", {
    "mx-auto w-full max-w-[940px]": isChatFocusedDemo,
  });

  return (
    <div className="space-y-4">
      <header className="animate-soft-enter overflow-hidden rounded-3xl border border-border/80 bg-card/92 shadow-[0_1px_0_rgb(255_255_255/0.72)_inset,0_18px_36px_rgb(15_23_42/0.08)]">
        <div className="border-b border-border/70 bg-gradient-to-r from-primary/20 via-chart-2/12 to-transparent px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {demo === "meeting" ? (
                <>
                  <p className="font-display text-base font-extrabold tracking-tight">会議レビューAI</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Step 1 で議事録を確定したら、合意形成を加速するレビューをチャット中心で進めます。
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
                  <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {demo === "meeting" && viewMode === "full" && meetingTranscriptConfirmed ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setMeetingDetailRailOpen((current) => !current)}
                >
                  {meetingDetailRailOpen ? "ログを隠す" : "ログを表示"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setViewMode((current) => (current === "guided" ? "full" : "guided"))}
              >
                {viewMode === "guided" ? "詳細モード" : "シンプル表示"}
              </Button>
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "streaming" : "ready"}
              </Badge>
            </div>
          </div>

          {viewMode === "full" && demo !== "meeting" ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {stageGates.map((stage) => (
                <div
                  key={stage.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs",
                    stage.done
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                      : "border-border/70 bg-background/84 text-muted-foreground",
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide">{stage.label}</p>
                  <p className="mt-1 font-semibold">{stage.done ? "done" : "waiting"}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2.5 px-5 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {viewMode === "full"
                ? `Stage completion: ${completedGateCount}/${stageGates.length}`
                : "現在の進捗"}
            </span>
            <span>{gateProgress}%</span>
          </div>
          <Progress value={gateProgress} />
          {viewMode === "full" && demo !== "meeting" ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">plan {planProgress}%</Badge>
              <Badge variant="outline">task {taskProgress}%</Badge>
              <Badge variant="outline">interventions {approvalLogs.length}</Badge>
            </div>
          ) : null}
        </div>
      </header>

      {topPanel && viewMode === "full" && demo !== "meeting" ? (
        <Card className="border-border/70 py-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
                Demo Guide & Data Source
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {topPanel}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ) : null}

      {showMeetingSetupCard ? (
        <Card className="border-border/70">
          <CardHeader className="space-y-2 border-b border-border/70">
            <CardTitle className="text-sm">Step 1: 議事録入力（必須）</CardTitle>
            <p className="text-xs text-muted-foreground">
              先に議事録を確定すると、その内容を基準に会議レビューをチャット内で進めます。
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {!meetingTranscriptConfirmed ? (
              <>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={loadMeetingSample}
                    disabled={!selectedMeetingSample || isStreaming}
                  >
                    サンプル読み込み
                  </Button>
                </div>
                <Textarea
                  value={meetingTranscript}
                  onChange={(event) => setMeetingTranscript(event.target.value)}
                  placeholder="議事録を貼り付けてください（必須・20文字以上）"
                  className="min-h-40 bg-background"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsTranscriptEditing(false)}
                    disabled={!meetingTranscriptReady || isStreaming}
                  >
                    議事録を確定してチャットを開始
                  </Button>
                  <Badge variant="outline">
                    {meetingTranscriptReady
                      ? `${transcriptStats.chars.toLocaleString("ja-JP")}文字`
                      : "20文字以上で確定可能"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                <p className="text-sm font-semibold">{transcriptHeadline}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {transcriptStats.chars.toLocaleString("ja-JP")}文字 / {transcriptStats.lines}行
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {transcriptPreview || "議事録プレビューは入力後に表示されます。"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTranscriptEditing(true)}
                  >
                    議事録を編集
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMeetingTranscript("");
                      setIsTranscriptEditing(true);
                    }}
                  >
                    クリア
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {showMeetingTranscriptSummaryBar ? (
        <Card className="border-border/70 bg-muted/15">
          <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{transcriptHeadline}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                会議レビューAI / {transcriptStats.chars.toLocaleString("ja-JP")}文字 /{" "}
                {transcriptStats.lines}行
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {transcriptPreview || "議事録プレビューは入力後に表示されます。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsTranscriptEditing(true)}
              >
                議事録を編集
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMeetingTranscript("");
                  setIsTranscriptEditing(true);
                }}
              >
                クリア
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showPrimaryChatWorkspace ? (
        <>
      <div className={workspaceGridClass}>
        {showMeetingPrimaryRail ? <aside className="space-y-4">
          {viewMode === "full" ? (
            <Card className="overflow-hidden border-border/70 py-0">
              <CardHeader className="border-b border-border/70 bg-muted/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Queue</CardTitle>
                  <div className="flex gap-1 text-xs">
                    <Badge variant="outline">i {queueSummary.info}</Badge>
                    <Badge variant="outline">w {queueSummary.warning}</Badge>
                    <Badge variant="outline">c {queueSummary.critical}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <QueuePanel className="border-none p-0 shadow-none">
                  <QueueList className="mt-0 p-3 [&>div]:max-h-[280px]">
                    {queue.map((item) => (
                      <QueueEntry key={item.id} className={getSeverityStyle(item.severity)}>
                        <div className="flex items-center gap-2">
                          <QueueItemIndicator completed={item.severity === "info"} />
                          <QueueItemContent>{item.title}</QueueItemContent>
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {item.severity}
                          </Badge>
                        </div>
                        <QueueItemDescription>{item.description}</QueueItemDescription>
                        <p className="ml-6 text-[11px] text-muted-foreground">{item.timestamp}</p>
                      </QueueEntry>
                    ))}
                  </QueueList>
                </QueuePanel>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Quick Start</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 text-xs text-muted-foreground">
                <p>Queue: critical {queueSummary.critical} / warning {queueSummary.warning}</p>
                <p>1. `Run Scenario` で最初の会話を生成</p>
                <p>2. 中央で内容を修正して再送</p>
                <p>3. 下段 Artifacts から成果物をコピー</p>
                {primaryScenario ? (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => void runScenario(primaryScenario)}
                    disabled={Boolean(runningScenarioId) || meetingPrerequisiteBlocked}
                  >
                    {runningScenarioId === primaryScenario.id ? "running..." : "Run Scenario"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}

          {viewMode === "full" && activeScenarios.length > 0 ? (
            <Card className="gap-3 border-border/70 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">1-click Demo Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4">
                <ScrollArea className="h-[350px] pr-2">
                  <div className="space-y-2">
                    {displayedScenarios.map((scenario) => (
                      <div key={scenario.id} className="rounded-lg border border-border/70 bg-background p-2.5">
                        <p className="text-xs font-semibold">{scenario.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{scenario.description}</p>
                        <Progress
                          className="mt-2 h-1.5"
                          value={
                            scenario.steps.length === 0
                              ? 0
                              : Math.round(
                                  (scenario.steps.filter(
                                    (step) => scenarioStepStates[scenario.id]?.[step.id] === "done",
                                  ).length /
                                    scenario.steps.length) *
                                    100,
                                )
                          }
                        />
                        {viewMode === "full" ? (
                          <ul className="mt-2 space-y-1">
                            {scenario.steps.map((step) => {
                              const stepStatus = scenarioStepStates[scenario.id]?.[step.id] ?? "pending";
                              return (
                                <li key={step.id} className="flex items-center justify-between text-[11px]">
                                  <span className="truncate">{step.label}</span>
                                  <span className={`rounded px-1.5 py-0.5 ${getScenarioStepBadgeStyle(stepStatus)}`}>
                                    {stepStatus}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            主要ステップ: {scenario.steps[0]?.label} → {scenario.steps[1]?.label ?? "..." }
                          </p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => void runScenario(scenario)}
                          disabled={Boolean(runningScenarioId) || meetingPrerequisiteBlocked}
                        >
                          {runningScenarioId === scenario.id ? "running..." : "Run Scenario"}
                        </Button>
                        {scenarioDurations[scenario.id] ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            last run: {scenarioDurations[scenario.id]}s
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {runningScenarioId ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                    <div className="flex items-center justify-between gap-2">
                      <span>{scenarioStatus ?? "実行中"}</span>
                      <span>{scenarioElapsedSec}s</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={stopScenario}
                    >
                      Stop Scenario
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </aside> : null}

        <section className={chatSectionClass}>
            {showStickySummary ? (
              <Card className="sticky top-20 z-30 border-border/80 bg-card/96 py-0 backdrop-blur">
                <CardContent className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-primary">最新サマリ（TL;DR）</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium">
                        {latestAssistantSummary?.summary ??
                          "最初の回答後に、ここへ最新サマリを固定表示します。"}
                      </p>
                      {latestAssistantSummary?.bullets && latestAssistantSummary.bullets.length > 0 ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {latestAssistantSummary.bullets.slice(0, 2).join(" / ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={isStreaming ? "default" : "outline"} className="text-[10px]">
                        {isStreaming ? "updating" : "latest"}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 px-2 text-[11px]"
                        onClick={() => setThinkingSidebarOpen(true)}
                      >
                        <ChevronRightIcon className="size-3.5" />
                        Thinkingログ
                      </Button>
                    </div>
                  </div>
                  {isStreaming ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-left text-xs text-primary transition-colors hover:bg-primary/10"
                      onClick={() => setThinkingSidebarOpen(true)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ChevronRightIcon className="size-3.5" />
                        <Shimmer>{streamingStatusLabel}</Shimmer>
                      </span>
                      <span className="text-[10px] text-primary/80">詳細</span>
                    </button>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <Card className="gap-0 overflow-hidden border-border/80 py-0">
              <CardHeader className="space-y-2 border-b border-border/70 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-display text-sm font-bold">
                  {demo === "meeting" ? "会議レビューAIチャット" : "Conversation"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={isStreaming ? "default" : "secondary"}>
                    {isStreaming ? "streaming..." : "ready"}
                  </Badge>
                  {viewMode === "full" ? (
                    <OpenIn query={draft || "この案件の次アクションを整理してください。"}>
                      <OpenInTrigger />
                      <OpenInContent>
                        <OpenInLabel>Open in</OpenInLabel>
                        <OpenInSeparator />
                        <OpenInChatGPT />
                        <OpenInClaude />
                        <OpenInv0 />
                      </OpenInContent>
                    </OpenIn>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {demo === "meeting"
                  ? "議事録確定後、このチャット上で要約・反証・次アクションを反復します。"
                  : "左列で開始し、ここで編集・再送して出力を固めます。"}
              </p>
              {showMeetingRuntimePanels ? (
                <div className="grid gap-1.5 md:grid-cols-4">
                  {agenticLanes.map((lane) => (
                    <div
                      key={lane.id}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-[10px]",
                        getAgentLaneStyle(lane.state),
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{lane.label}</span>
                        <span>{lane.state}</span>
                      </div>
                      <p className="mt-0.5 truncate">{lane.detail}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {showMeetingRuntimePanels ? (
                <div className="rounded-md border border-border/70 bg-background/80 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold">Agent Runtime</p>
                    <Badge variant={runningToolCount > 0 ? "default" : "outline"} className="text-[10px]">
                      {runningToolCount > 0 ? `${runningToolCount} running` : "idle"}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {latestToolEvents.slice(0, 6).map((tool) => (
                      <div
                        key={tool.id}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          getStatusBadgeStyle(tool.status),
                        )}
                      >
                        {tool.name}: {compactUiText(tool.detail, 36)}
                      </div>
                    ))}
                    {latestToolEvents.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">
                        送信するとツール実行ログがここに表示されます。
                      </p>
                    ) : null}
                  </div>
                  {microAgentProgress.total > 0 ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      branch: success {microAgentProgress.done} / running {microAgentProgress.running} / error{" "}
                      {microAgentProgress.error}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {showMeetingRuntimePanels ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-primary">結論（TL;DR）</p>
                  <Badge variant={isStreaming ? "default" : "outline"} className="text-[10px]">
                    {isStreaming ? "更新中" : "最新"}
                  </Badge>
                </div>
                <div
                  className={cn(
                    "mt-2 grid gap-2",
                    assumptionHints.length > 0
                      ? "md:grid-cols-[minmax(0,1fr)_280px]"
                      : "md:grid-cols-1",
                  )}
                >
                  <div className="rounded-md border border-border/60 bg-background px-2.5 py-2">
                    {latestAssistantSummary ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-foreground">
                          {latestAssistantSummary.summary}
                        </p>
                        {latestAssistantSummary.bullets.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground">
                            {latestAssistantSummary.bullets.slice(0, 2).join(" / ")}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        まだ回答がありません。最初の回答を生成すると、ここに結論を固定表示します。
                      </p>
                    )}
                  </div>
                  {assumptionHints.length > 0 ? (
                    <div className="rounded-md border border-border/60 bg-background px-2.5 py-2">
                      <p className="text-[11px] font-semibold">推論仮定</p>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                        {assumptionHints.map((item, index) => (
                          <li key={`${item}-${index}`}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {demo === "meeting" && meetingDecisionTimeline.length > 0 ? (
                  <div className="mt-2 rounded-md border border-border/60 bg-background px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold">決定事項タイムライン</p>
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                        会議中 → 会議後
                      </Badge>
                    </div>
                    <ChainOfThought className="mt-1" defaultOpen={false}>
                      <ChainOfThoughtHeader className="text-[11px]">
                        主要な決定と実行タスク
                      </ChainOfThoughtHeader>
                      <ChainOfThoughtContent className="space-y-2">
                        {meetingDecisionTimeline.map((item) => (
                          <ChainOfThoughtStep
                            key={item.id}
                            label={
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                                  {item.phase}
                                </Badge>
                                <span className="font-medium">{item.title}</span>
                              </div>
                            }
                            description={item.detail}
                            status={item.status}
                          />
                        ))}
                      </ChainOfThoughtContent>
                    </ChainOfThought>
                  </div>
                ) : null}

                <Accordion type="single" collapsible className="mt-2">
                  <AccordionItem value="details" className="border-b-0">
                    <AccordionTrigger className="py-1 text-[11px] hover:no-underline">
                      詳細を表示（論点・リスク・次アクション・推論ログ）
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-1">
                      {structuredInsight ? (
                        <>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-md border border-border/60 bg-background p-2">
                              <p className="text-[11px] font-semibold">重要論点</p>
                              <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                                {structuredInsight.keyPoints.slice(0, 6).map((point) => (
                                  <li key={point}>• {point}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-md border border-border/60 bg-background p-2">
                              <p className="text-[11px] font-semibold">主要リスク</p>
                              {structuredInsight.risks.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  {structuredInsight.risks.slice(0, 4).map((risk) => (
                                    <div
                                      key={risk.title}
                                      className="rounded border border-border/60 px-1.5 py-1 text-[10px]"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{risk.title}</span>
                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                                          {risk.severity}
                                        </Badge>
                                      </div>
                                      <p className="mt-0.5 text-muted-foreground">{risk.mitigation}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-[11px] text-muted-foreground">リスク抽出なし</p>
                              )}
                            </div>
                          </div>
                          <div className="rounded-md border border-border/60 bg-background p-2">
                            <p className="text-[11px] font-semibold">次アクション</p>
                            {structuredInsight.actions.length > 0 ? (
                              <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                                {structuredInsight.actions.slice(0, 5).map((action) => (
                                  <li key={`${action.task}-${action.owner}`}>
                                    • {action.task}（{action.owner} / {action.due} / {action.metric}）
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                アクション抽出なし
                              </p>
                            )}
                          </div>
                          {structuredInsight.evidence.length > 0 ? (
                            <div className="rounded-md border border-border/60 bg-background p-2">
                              <p className="text-[11px] font-semibold">根拠と追加確認</p>
                              <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                                {structuredInsight.evidence.slice(0, 4).map((item, index) => (
                                  <li key={`${item.claim}-${index}`}>
                                    • {item.claim} / 次確認: {item.nextCheck}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          詳細は最初の回答生成後に表示されます。
                        </p>
                      )}

                      <ChainOfThought defaultOpen={false}>
                        <ChainOfThoughtHeader>Agent Worklog（CoT）</ChainOfThoughtHeader>
                        <ChainOfThoughtContent>
                          {worklogSteps.map((step) => (
                            <ChainOfThoughtStep
                              key={step.id}
                              label={step.label}
                              description={step.description}
                              status={step.status}
                            >
                              <ChainOfThoughtSearchResults>
                                {step.tags.map((tag) => (
                                  <ChainOfThoughtSearchResult key={`${step.id}-${tag}`}>
                                    {tag}
                                  </ChainOfThoughtSearchResult>
                                ))}
                              </ChainOfThoughtSearchResults>
                            </ChainOfThoughtStep>
                          ))}
                        </ChainOfThoughtContent>
                      </ChainOfThought>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Reasoning
                  className="mt-2 rounded-md border border-border/60 bg-background px-2.5 py-2"
                  defaultOpen={false}
                  isStreaming={isStreaming}
                >
                  <ReasoningTrigger className="text-[11px]">
                    Agent Working Trace（推論・実行ログ）
                  </ReasoningTrigger>
                  <ReasoningContent className="text-[11px] leading-6">
                    {reasoningTraceMarkdown}
                  </ReasoningContent>
                </Reasoning>
                </div>
              ) : null}
            </CardHeader>

            <Conversation
              className={cn(
                "bg-muted/20",
                demo === "meeting" && meetingTranscriptConfirmed
                  ? "h-[620px]"
                  : viewMode === "guided"
                    ? "h-[420px]"
                    : "h-[540px]",
              )}
            >
              <ConversationContent className="gap-4 p-4">
                <ConversationAutoFollower enabled followKey={conversationFollowKey} />
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="まだ会話はありません"
                    description={
                      demo === "meeting"
                        ? "Step 1 を確定後、下の入力欄から開始してください。"
                        : "左のシナリオを実行するか、下の入力欄から開始してください。"
                    }
                  />
                ) : null}
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <MessageResponse
                              key={`${message.id}-${index}`}
                              className="leading-7 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-2 [&_h2]:text-sm [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ul]:my-2 [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-slate-950/90 [&_pre]:p-3 [&_pre]:text-slate-100 [&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-border/70 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border/70 [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1"
                            >
                              {part.text}
                            </MessageResponse>
                          );
                        }

                        if (part.type === "source-url") {
                          return (
                            <a
                              key={`${message.id}-${index}`}
                              href={part.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              Source: {part.title ?? part.url}
                            </a>
                          );
                        }

                        if (part.type === "data-citation") {
                          return (
                            <p key={`${message.id}-${index}`} className="text-xs text-muted-foreground">
                              根拠: {part.data.title}
                            </p>
                          );
                        }

                        return null;
                      })}
                    </MessageContent>
                  </Message>
                ))}
                {isStreaming ? (
                  <Message from="assistant">
                    <MessageContent>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                        onClick={() => setThinkingSidebarOpen(true)}
                      >
                        <ChevronRightIcon className="size-3.5" />
                        <Shimmer>{streamingStatusLabel}</Shimmer>
                      </button>
                    </MessageContent>
                  </Message>
                ) : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <CardContent className="space-y-3 border-t border-border/70 bg-background p-4">
              {meetingPrerequisiteBlocked ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Step 1 で議事録を確定すると、ここからチャット入力できます。
                </div>
              ) : (
                <>
                  {inputSuggestions.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        次の入力のおすすめ（クリックで送信）
                      </p>
                      <Suggestions>
                        {inputSuggestions.map((suggestion) => (
                          <Suggestion
                            key={suggestion}
                            suggestion={suggestion}
                            onClick={(value) => {
                              void sendFollowUpSuggestion(value);
                            }}
                            disabled={isStreaming || meetingPrerequisiteBlocked}
                            className="h-8 rounded-full bg-background text-xs"
                          />
                        ))}
                      </Suggestions>
                    </div>
                  ) : null}
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    placeholder={
                      demo === "meeting"
                        ? "会議の論点や確認したい内容を入力（Cmd/Ctrl + Enter で送信）"
                        : "メッセージを入力（Cmd/Ctrl + Enter で送信 / Esc で停止）"
                    }
                    className="min-h-24 resize-y"
                  />

                  {viewMode === "full" ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <label className="inline-flex cursor-pointer items-center">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(event) => handleFileSelection(event.target.files)}
                          />
                          <Button type="button" size="sm" variant="outline" asChild>
                            <span>添付</span>
                          </Button>
                        </label>
                        <span>{attachmentNames.length > 0 ? attachmentNames.join(", ") : "添付なし"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void send()}
                          disabled={isStreaming || meetingPrerequisiteBlocked}
                        >
                          送信
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void runDevilsAdvocate()}
                          disabled={isStreaming || meetingPrerequisiteBlocked}
                        >
                          反証レビュー
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={stop}
                        >
                          停止
                        </Button>
                        <Button type="button" variant="outline" onClick={createCheckpoint}>
                          Checkpoint保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => void send()}
                        disabled={isStreaming || meetingPrerequisiteBlocked}
                      >
                        送信
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void runDevilsAdvocate()}
                        disabled={isStreaming || meetingPrerequisiteBlocked}
                      >
                        反証レビュー
                      </Button>
                      {isStreaming ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={stop}
                        >
                          停止
                        </Button>
                      ) : null}
                    </div>
                  )}
                </>
              )}
              {loopStatus ? <p className="text-xs text-muted-foreground">{loopStatus}</p> : null}

              {(enableVoice || enableTts) && viewMode === "full" ? (
                <div className="grid gap-3 rounded-lg border bg-muted/40 p-3 md:grid-cols-2">
                  {enableVoice ? (
                    <div>
                      <p className="text-xs font-semibold">Voice Input</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" onClick={startVoiceInput}>
                          音声入力開始
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={stopVoiceInput}>
                          停止
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">状態: {voiceStatus}</p>
                    </div>
                  ) : null}
                  {enableTts ? (
                    <div>
                      <p className="text-xs font-semibold">TTS Preview</p>
                      <Select value={ttsVoice} onValueChange={setTtsVoice}>
                        <SelectTrigger className="mt-2 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ja-JP-default">ja-JP-default</SelectItem>
                          <SelectItem value="ja-JP-clear">ja-JP-clear</SelectItem>
                          <SelectItem value="ja-JP-station">ja-JP-station</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" className="mt-2" onClick={() => void previewTts()}>
                        読み上げ確認
                      </Button>
                      {ttsNote ? <p className="mt-1 text-xs text-muted-foreground">{ttsNote}</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error ? <p className="text-xs text-red-600">{error.message}</p> : null}
            </CardContent>
          </Card>
        </section>

        {showDetailRail ? (
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card className="gap-3 border-border/70 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Model & Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={provider}
                  onValueChange={(value) => setProvider(value as ModelProvider)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS[provider].map((modelOption) => (
                      <SelectItem key={modelOption} value={modelOption}>
                        {modelOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ContextMeter
                usedTokens={contextStats.inputTokens + contextStats.outputTokens}
                maxTokens={32000}
                modelId={model}
                usage={{
                  inputTokens: contextStats.inputTokens,
                  inputTokenDetails: {
                    noCacheTokens: contextStats.inputTokens,
                    cacheReadTokens: 0,
                    cacheWriteTokens: 0,
                  },
                  outputTokens: contextStats.outputTokens,
                  outputTokenDetails: {
                    textTokens: contextStats.outputTokens,
                    reasoningTokens: 0,
                  },
                  totalTokens: contextStats.inputTokens + contextStats.outputTokens,
                }}
              >
                <ContextTrigger size="sm" className="w-full justify-between" />
                <ContextContent>
                  <ContextContentHeader />
                  <ContextContentBody>
                    <p className="text-xs">input: {contextStats.inputTokens}</p>
                    <p className="text-xs">output: {contextStats.outputTokens}</p>
                  </ContextContentBody>
                  <ContextContentFooter />
                </ContextContent>
              </ContextMeter>
              <p className="text-xs text-muted-foreground">status: {status}</p>
              <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-xs">
                <p className="font-medium">Runtime</p>
                {runtimeInfo ? (
                  <div className="mt-1 space-y-1 text-muted-foreground">
                    <p>
                      現在の実行: {selectedProviderLabel} /{" "}
                      {selectedProviderConfigured ? "configured" : `${selectedProviderKeyLabel} missing`}
                    </p>
                    <p>
                      代替プロバイダ: {alternateProviderConfigured ? "configured" : "missing"}
                    </p>
                    {providerHint ? <p className="text-amber-700">{providerHint}</p> : null}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">{runtimeStatus ?? "loading..."}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {viewMode === "full" ? (
            <Tabs defaultValue="execution">
            <TabsList className="w-full bg-muted/40">
              <TabsTrigger value="execution">Execution</TabsTrigger>
              {viewMode === "full" ? <TabsTrigger value="ops">Ops</TabsTrigger> : null}
              {viewMode === "full" ? <TabsTrigger value="audit">Audit</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="execution" className="space-y-4">
              <Plan defaultOpen isStreaming={isStreaming}>
                <PlanHeader>
                  <div>
                    <PlanTitle>Execution Plan</PlanTitle>
                    <PlanDescription>進捗を見ながら介入ポイントと反復を管理します。</PlanDescription>
                  </div>
                  <PlanAction>
                    <PlanTrigger />
                  </PlanAction>
                </PlanHeader>
                <PlanContent className="space-y-2">
                  {plan.map((step) => (
                    <div key={step.id} className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
                      <span>{step.title}</span>
                      <span className={`rounded px-1.5 py-0.5 ${getStatusBadgeStyle(step.status)}`}>
                        {step.status}
                      </span>
                    </div>
                  ))}
                </PlanContent>
              </Plan>

              <Card className="gap-3 border-border/70 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Task Checklist</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  {viewMode === "full" ? (
                    <Task defaultOpen>
                      <TaskTrigger title="Checklist" />
                      <TaskContent>
                        {tasks.map((task) => (
                          <TaskEntry key={task.id}>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={(event) => {
                                  const done = event.target.checked;
                                  setTasks((prev) =>
                                    prev.map((current) =>
                                      current.id === task.id ? { ...current, done } : current,
                                    ),
                                  );
                                }}
                              />
                              <span>{task.label}</span>
                            </label>
                          </TaskEntry>
                        ))}
                      </TaskContent>
                    </Task>
                  ) : (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>未完了: {tasks.filter((task) => !task.done).length}</p>
                      <p>完了: {tasks.filter((task) => task.done).length}</p>
                      <p>詳細なチェック更新は Full 表示で編集できます。</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {viewMode === "full" ? <TabsContent value="ops" className="space-y-4">
              <Card className="gap-3 border-border/70 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Tool Logs</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <ScrollArea className="h-[320px]">
                    <div className="space-y-2 pr-2 text-xs">
                      {latestToolEvents.map((tool) => (
                        <Tool
                          key={tool.id}
                          className="mb-0 border-border/70 bg-muted/20"
                          defaultOpen={tool.status === "running"}
                        >
                          <ToolHeader
                            type="dynamic-tool"
                            state={toToolUiState(tool.status)}
                            toolName={tool.name}
                            title={tool.name}
                          />
                          <ToolContent className="space-y-2 p-3">
                            <ToolInput
                              input={{
                                timestamp: tool.timestamp,
                              }}
                            />
                            <ToolOutput
                              output={
                                tool.status === "error"
                                  ? undefined
                                  : {
                                      detail: tool.detail,
                                      timestamp: tool.timestamp,
                                    }
                              }
                              errorText={tool.status === "error" ? tool.detail : undefined}
                            />
                          </ToolContent>
                        </Tool>
                      ))}
                      {tools.length === 0 ? <p className="text-muted-foreground">ログなし</p> : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent> : null}

            {viewMode === "full" ? <TabsContent value="audit" className="space-y-4">
              <Card className="gap-3 border-border/70 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Checkpoint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4">
                  <CheckpointBar>
                    <CheckpointTrigger onClick={createCheckpoint} tooltip="現時点を保存">
                      <CheckpointIcon />
                      save current
                    </CheckpointTrigger>
                  </CheckpointBar>
                  <Separator />
                  <ScrollArea className="h-[140px]">
                    <div className="space-y-2 pr-2">
                      {checkpoints.map((checkpoint) => (
                        <Button
                          key={checkpoint.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => restoreCheckpoint(checkpoint)}
                        >
                          {checkpoint.label}
                        </Button>
                      ))}
                      {checkpoints.length === 0 ? <p className="text-xs text-muted-foreground">保存済みなし</p> : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="gap-3 border-border/70 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Intervention Ledger</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <ScrollArea className="h-[210px]">
                    <div className="space-y-2 pr-2 text-xs">
                      {approvalLogs.map((log) => (
                        <div key={log.id} className="rounded-md border bg-muted/20 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{log.action}</p>
                            <Badge variant={log.status === "approved" ? "default" : "outline"}>
                              {log.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-muted-foreground">{log.reason}</p>
                          <p className="mt-1 text-muted-foreground">{log.timestamp}</p>
                        </div>
                      ))}
                      {approvalLogs.length === 0 ? <p className="text-muted-foreground">介入履歴なし</p> : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="gap-3 border-border/70 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-sm">Saved Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4">
                  <Button type="button" className="w-full" onClick={saveSession}>
                    セッション保存
                  </Button>
                  {sessionStatus ? <p className="text-xs text-muted-foreground">{sessionStatus}</p> : null}
                  {sessions.length > 0 ? (
                    <ScrollArea className="h-[190px]">
                      <div className="space-y-2 pr-2">
                        {sessions.map((session) => (
                          <div key={session.id} className="rounded-lg border border-border/70 p-2 text-xs">
                            <p className="font-semibold">{session.title}</p>
                            <p className="text-muted-foreground">
                              {session.modelProvider} / {session.modelId}
                            </p>
                            <p className="text-muted-foreground">{session.updatedAt}</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-1 w-full"
                              onClick={() => void restoreSession(session.id)}
                            >
                              復元
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground">保存済みセッションなし</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent> : null}
            </Tabs>
          ) : (
            <Card className="gap-3 border-border/70 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">Execution Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 text-xs">
                {plan.slice(0, 3).map((step) => (
                  <div key={step.id} className="flex items-center justify-between rounded-md border px-2 py-1">
                    <span>{step.title}</span>
                    <span className={`rounded px-1.5 py-0.5 ${getStatusBadgeStyle(step.status)}`}>
                      {step.status}
                    </span>
                  </div>
                ))}
                <p className="text-muted-foreground">未完了タスク: {tasks.filter((task) => !task.done).length}</p>
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setViewMode("full")}>
                  詳細を表示
                </Button>
              </CardContent>
            </Card>
          )}
          </aside>
        ) : null}
      </div>

      {shouldShowArtifacts ? (
        <Card className="border-border/70 py-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="artifacts" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <span>成果物</span>
                  <Badge variant="outline">{artifacts.length}</Badge>
                  {selectedArtifact ? (
                    <span className="max-w-[300px] truncate text-xs text-muted-foreground">
                      {selectedArtifact.name}
                    </span>
                  ) : null}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {viewMode === "full" ? (
                  <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
                    <Card className="gap-3 border-border/70 py-4">
                      <CardHeader className="px-4">
                        <CardTitle className="text-sm">成果物一覧</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4">
                        <ScrollArea className="h-[220px]">
                          <div className="space-y-1 pr-2">
                            {artifacts.map((artifact) => (
                              <Button
                                key={artifact.id}
                                type="button"
                                variant={selectedArtifact?.id === artifact.id ? "default" : "outline"}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSelectedArtifactId(artifact.id)}
                              >
                                {artifact.name}
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <ArtifactPanel>
                      <ArtifactHeader>
                        <ArtifactTitle>{selectedArtifact?.name ?? "成果物未選択"}</ArtifactTitle>
                        <ArtifactActions>
                          <ArtifactAction
                            onClick={() => setArtifactViewMode("rendered")}
                            tooltip="Preview"
                            disabled={!selectedArtifact}
                          >
                            preview
                          </ArtifactAction>
                          <ArtifactAction
                            onClick={() => setArtifactViewMode("raw")}
                            tooltip="Raw"
                            disabled={!selectedArtifact}
                          >
                            raw
                          </ArtifactAction>
                          <ArtifactAction
                            onClick={() => void copyArtifact()}
                            tooltip="Copy"
                            disabled={!selectedArtifact}
                          >
                            {selectedArtifact && copiedArtifactId === selectedArtifact.id ? "copied" : "copy"}
                          </ArtifactAction>
                          <ArtifactAction
                            onClick={downloadArtifact}
                            tooltip="Download"
                            disabled={!selectedArtifact}
                          >
                            download
                          </ArtifactAction>
                        </ArtifactActions>
                      </ArtifactHeader>
                      <ArtifactContent>
                        {selectedArtifact ? (
                          artifactViewMode === "rendered" && selectedArtifact.kind === "html" ? (
                            <iframe
                              title={selectedArtifact.name}
                              srcDoc={selectedArtifact.content}
                              className="h-72 w-full rounded-lg border"
                            />
                          ) : artifactViewMode === "rendered" && selectedArtifact.kind === "markdown" ? (
                            <div className="max-h-80 overflow-auto rounded-lg border border-border/70 bg-background p-3">
                              <MessageResponse className="leading-7 [&_h1]:text-base [&_h2]:text-sm [&_li]:my-0.5 [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_table]:my-2 [&_table]:w-full [&_td]:border [&_td]:border-border/70 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border/70 [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1">
                                {selectedArtifact.content}
                              </MessageResponse>
                            </div>
                          ) : (
                            <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                              {selectedArtifact.content}
                            </pre>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">成果物はまだありません。</p>
                        )}
                      </ArtifactContent>
                    </ArtifactPanel>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {artifacts.length > 0 ? (
                      <div className="max-w-xs">
                        <Select
                          value={selectedArtifact?.id ?? artifacts[0]?.id ?? ""}
                          onValueChange={setSelectedArtifactId}
                        >
                          <SelectTrigger className="h-8 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {artifacts.map((artifact) => (
                              <SelectItem key={artifact.id} value={artifact.id}>
                                {artifact.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <ArtifactPanel>
                      <ArtifactHeader>
                        <ArtifactTitle>{selectedArtifact?.name ?? "成果物未選択"}</ArtifactTitle>
                        <ArtifactActions>
                          <ArtifactAction
                            onClick={() => void copyArtifact()}
                            tooltip="Copy"
                            disabled={!selectedArtifact}
                          >
                            {selectedArtifact && copiedArtifactId === selectedArtifact.id ? "copied" : "copy"}
                          </ArtifactAction>
                          <ArtifactAction
                            onClick={downloadArtifact}
                            tooltip="Download"
                            disabled={!selectedArtifact}
                          >
                            download
                          </ArtifactAction>
                        </ArtifactActions>
                      </ArtifactHeader>
                      <ArtifactContent>
                        {selectedArtifact ? (
                          artifactViewMode === "rendered" && selectedArtifact.kind === "markdown" ? (
                            <div className="max-h-72 overflow-auto rounded-lg border border-border/70 bg-background p-3">
                              <MessageResponse className="leading-7 [&_h1]:text-base [&_h2]:text-sm [&_li]:my-0.5 [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100">
                                {selectedArtifact.content}
                              </MessageResponse>
                            </div>
                          ) : (
                            <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                              {selectedArtifact.content}
                            </pre>
                          )
                        ) : (
                          <p className="text-sm text-muted-foreground">成果物はまだありません。</p>
                        )}
                      </ArtifactContent>
                    </ArtifactPanel>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ) : hasConversationStarted ? (
        <Card className="border-border/70 py-3">
          <CardContent className="px-4 py-0 text-xs text-muted-foreground">
            回答生成後に成果物（コピー/ダウンロード）が表示されます。
          </CardContent>
        </Card>
      ) : null}

      {viewMode === "full" && citations.length > 0 ? (
        <Sources>
          <SourcesTrigger count={citations.length} />
          <SourcesContent>
            {citations.map((citation) => (
              <Source key={citation.id} href={citation.url} title={citation.title}>
                <span className="text-xs">
                  {citation.title}
                  {citation.quote ? ` - ${citation.quote}` : ""}
                </span>
              </Source>
            ))}
          </SourcesContent>
        </Sources>
      ) : null}

      {viewMode === "full" ? bottomPanel : null}
        </>
      ) : null}

      <Dialog open={thinkingSidebarOpen} onOpenChange={setThinkingSidebarOpen}>
        <DialogContent
          showCloseButton
          className="left-auto right-0 top-0 h-dvh w-full max-w-[480px] translate-x-0 translate-y-0 rounded-none border-l border-border/80 bg-background p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-[480px]"
        >
          <DialogHeader className="gap-1 border-b border-border/70 px-4 py-3 text-left">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <PanelsRightBottomIcon className="size-4 text-primary" />
              Thinking Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              実行中のステップ・ツール・推論ログをここで確認できます。
            </DialogDescription>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant={isStreaming ? "default" : "outline"} className="text-[10px]">
                {isStreaming ? "streaming" : "ready"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {streamingStatusLabel}
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[calc(100dvh-112px)] px-4 py-3">
            <div className="space-y-3 pb-4">
              <Reasoning
                defaultOpen
                isStreaming={isStreaming}
                className="rounded-md border border-border/70 bg-card px-3 py-2"
              >
                <ReasoningTrigger className="text-xs">現在の推論要約</ReasoningTrigger>
                <ReasoningContent className="mt-1 text-xs leading-6">
                  {reasoningTraceMarkdown}
                </ReasoningContent>
              </Reasoning>

              <Card className="border-border/70 py-0">
                <CardHeader className="border-b border-border/70 px-3 py-2">
                  <CardTitle className="text-xs">ステップ進行</CardTitle>
                </CardHeader>
                <CardContent className="px-3 py-2">
                  <ChainOfThought defaultOpen>
                    <ChainOfThoughtContent className="space-y-2">
                      {(demo === "meeting" && liveAgentSteps.length > 0
                        ? liveAgentSteps.map((step) => ({
                            id: step.id,
                            label: step.label,
                            description: compactUiText(step.detail, 120),
                            status: step.status === "done"
                              ? "complete"
                              : step.status === "doing"
                                ? "active"
                                : "pending",
                            tags: [getStatusLabel(step.status)],
                          }))
                        : worklogSteps.map((step) => ({
                            id: step.id,
                            label: step.label,
                            description: compactUiText(step.description, 120),
                            status: step.status,
                            tags: step.tags,
                          }))).map((step) => (
                        <ChainOfThoughtStep
                          key={`thinking-sidebar-${step.id}`}
                          label={step.label}
                          description={step.description}
                          status={step.status as "complete" | "active" | "pending"}
                        >
                          <ChainOfThoughtSearchResults>
                            {step.tags.slice(0, 2).map((tag) => (
                              <ChainOfThoughtSearchResult key={`${step.id}-${tag}`}>
                                {tag}
                              </ChainOfThoughtSearchResult>
                            ))}
                          </ChainOfThoughtSearchResults>
                        </ChainOfThoughtStep>
                      ))}
                    </ChainOfThoughtContent>
                  </ChainOfThought>
                </CardContent>
              </Card>

              <Card className="border-border/70 py-0">
                <CardHeader className="border-b border-border/70 px-3 py-2">
                  <CardTitle className="text-xs">Tool Runtime</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-3 py-2">
                  {latestToolEvents.length > 0 ? (
                    latestToolEvents.slice(0, 8).map((tool) => (
                      <Tool key={`thinking-tool-${tool.id}`} defaultOpen={tool.status === "running"}>
                        <ToolHeader
                          type="dynamic-tool"
                          state={toToolUiState(tool.status)}
                          toolName={tool.name}
                          title={tool.name}
                        />
                        <ToolContent className="px-3 pb-3">
                          <ToolOutput
                            output={
                              tool.status === "error"
                                ? undefined
                                : {
                                    detail: tool.detail,
                                    timestamp: tool.timestamp,
                                  }
                            }
                            errorText={tool.status === "error" ? tool.detail : undefined}
                          />
                        </ToolContent>
                      </Tool>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">送信するとツールログが表示されます。</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {approval?.required ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Confirmation</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{approval.action}</h3>
            <p className="mt-2 text-sm text-slate-700">{approval.reason}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void approveCurrentAction()}>
                承認して実行
              </Button>
              <Button type="button" variant="outline" onClick={dismissCurrentAction}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
