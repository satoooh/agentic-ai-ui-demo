"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
  Context as ContextMeter,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import { Message, MessageContent } from "@/components/ai-elements/message";
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
import {
  Task,
  TaskContent,
  TaskItem as TaskEntry,
  TaskTrigger,
} from "@/components/ai-elements/task";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  demoMode: "mock" | "live";
  hasOpenAIKey: boolean;
  hasGeminiKey: boolean;
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
  return {
    id: `meeting-loop-${profile.id}`,
    title: `${profile.label}シナリオ`,
    description: `${profile.label}の主要論点に沿って、反証レビューから次アクション確定まで実行。`,
    outcome: `${profile.expectedOutput}を短時間で作成`,
    targetDurationSec: 62,
    steps: [
      {
        id: `meeting-${profile.id}-step-1`,
        label: "議事録要約",
        prompt: `${profile.label}として、議事録から決定事項と保留事項を整理してください。`,
      },
      {
        id: `meeting-${profile.id}-step-2`,
        label: "主要論点抽出",
        prompt: `主要論点（${profile.keyTopics.join(" / ")}）ごとに論点と不足データを整理してください。`,
      },
      {
        id: `meeting-${profile.id}-step-3`,
        label: "悪魔の代弁者",
        prompt: `${profile.label}の前提に対して悪魔の代弁者レビューを実行し、反証を2件提示してください。`,
      },
      {
        id: `meeting-${profile.id}-step-4`,
        label: "次アクション確定",
        prompt: `${template.title}の形式で、次回までのアクション表を作成してください。`,
      },
    ],
  };
}

function buildMeetingDraftTemplate(profile: MeetingProfile): string {
  const template = MEETING_OUTPUT_TEMPLATES[profile.id];
  return [
    `会議タイプ: ${profile.label}`,
    "",
    "## 会議ログ要約",
    "- ",
    "",
    `## ${template.sections[0]}`,
    "- ",
    "",
    `## ${template.sections[1]}`,
    "- ",
    "",
    `## ${template.sections[2]}`,
    "- ",
    "",
    `## 次アクション表`,
    `| ${template.actionColumns.join(" | ")} |`,
    `| ${template.actionColumns.map(() => "---").join(" | ")} |`,
    `|  |  |  |  |`,
    "",
    "## 不足データと次回確認事項",
    "- ",
  ].join("\n");
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

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

function getAutonomousLoopPrompts(
  demo: DemoId,
  goal: string,
  meetingProfile?: MeetingProfile,
): string[] {
  const normalizedGoal = goal.trim();

  if (demo === "sales") {
    const baseGoal = normalizedGoal || "IT企業向けに提案骨子を作成したい";
    return [
      `営業ゴール: ${baseGoal}\n公開情報からアカウント要点を3点で要約してください。`,
      "ここまでの提案案に対して悪魔の代弁者として反証ポイントを3つ出し、修正案を提示してください。",
      "修正後の提案として、次回商談までの実行タスクと追加調査クエリを3つ出してください。",
    ];
  }

  if (demo === "recruiting") {
    const baseGoal = normalizedGoal || "採用のミスマッチを減らしたい";
    return [
      `採用ゴール: ${baseGoal}\n候補者評価の観点を強み/懸念で整理してください。`,
      "悪魔の代弁者として、採用後ミスマッチのシナリオを2つ作り、面接質問へ反映してください。",
      "次の探索条件と、面接官が確認すべきチェック項目を箇条書きで生成してください。",
    ];
  }

  if (demo === "meeting") {
    const profile = meetingProfile ?? MEETING_PROFILES[0];
    const template = MEETING_OUTPUT_TEMPLATES[profile.id];
    const baseGoal = normalizedGoal || `${profile.label}の結論妥当性を検証したい`;
    return [
      `会議レビュー対象:\n${baseGoal}\n${profile.label}の主要論点（${profile.keyTopics.join(
        " / ",
      )}）で決定事項と保留事項を整理してください。`,
      `${profile.label}の前提に対して悪魔の代弁者レビューを実行し、失敗シナリオを2つ提示してください。`,
      `${template.title}の形式で、次回会議までのアクション（${template.actionColumns.join(
        " / ",
      )}）をMarkdown tableで出してください。`,
    ];
  }

  const baseGoal = normalizedGoal || "企業の公開情報を使って意思決定に使える示唆を得たい";
  return [
    `調査ゴール: ${baseGoal}\n公開IR/ニュースから事実ベースの示唆を3点に要約してください。`,
    "悪魔の代弁者として、示唆の前提が崩れるシナリオを2件と確認すべき根拠を挙げてください。",
    "次の調査ループとして、競合比較や追加検証に使える探索クエリを3つ作ってください。",
  ];
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
  const [chatModeOverride, setChatModeOverride] = useState<"auto" | "mock" | "live">("auto");
  const [provider, setProvider] = useState<ModelProvider>("openai");
  const [model, setModel] = useState(getDefaultModel("openai"));
  const [meetingProfileId, setMeetingProfileId] = useState(MEETING_PROFILES[0].id);
  const [draft, setDraft] = useState("");
  const [meetingTranscript, setMeetingTranscript] = useState("");
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
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [loopStatus, setLoopStatus] = useState<string | null>(null);
  const [isAutoLoopRunning, setIsAutoLoopRunning] = useState(false);

  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const scenarioAbortRef = useRef(false);
  const autoLoopAbortRef = useRef(false);
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
        setTools((prev) => upsertById(prev, part.data as ToolEvent));
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

  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[0],
    [artifacts, selectedArtifactId],
  );
  const selectedMeetingProfile = useMemo(
    () => MEETING_PROFILES.find((profile) => profile.id === meetingProfileId) ?? MEETING_PROFILES[0],
    [meetingProfileId],
  );
  const selectedMeetingOutputTemplate = useMemo(
    () => MEETING_OUTPUT_TEMPLATES[selectedMeetingProfile.id],
    [selectedMeetingProfile.id],
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

  const isStreaming = status === "streaming" || status === "submitted";

  const withDemoContext = useCallback(
    (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed) {
        return "";
      }

      if (demo !== "meeting") {
        return trimmed;
      }

      const contextBlock =
        "会議設定:\n" +
        `- 会議タイプ: ${selectedMeetingProfile.label}\n` +
        `- 目的: ${selectedMeetingProfile.objective}\n` +
        `- 参加者: ${selectedMeetingProfile.participants}\n` +
        `- 期待成果: ${selectedMeetingProfile.expectedOutput}\n` +
        `- 主要論点: ${selectedMeetingProfile.keyTopics.join(" / ")}\n` +
        "上記設定を必ず前提にして、日本語で簡潔に回答してください。\n\n" +
        `${buildMeetingOutputFormatInstruction(selectedMeetingProfile)}\n` +
        "必ず見出し付きで出力し、次アクション表は Markdown table で記述してください。";

      return `${contextBlock}\n\nユーザー依頼:\n${trimmed}`;
    },
    [demo, selectedMeetingProfile],
  );

  const send = async () => {
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
        body: {
          demo,
          provider,
          model,
          ...(chatModeOverride !== "auto" ? { modeOverride: chatModeOverride } : {}),
          approved: false,
        },
      },
    );

    setDraft("");
    setAttachmentNames([]);
  };

  const runDevilsAdvocate = async () => {
    if (isStreaming) {
      return;
    }

    const transcript = buildConversationTranscript(messages);
    const meetingLog = meetingTranscript.trim();
    const notes = draft.trim();

    const basePrompt =
      "あなたは悪魔の代弁者エージェントです。以下の会話ログを読み、" +
      "前提の穴・反証シナリオ・失敗時の影響・追加で取るべき検証データを、日本語で簡潔に出してください。";
    const promptSections = [
      basePrompt,
      meetingLog
        ? `会議ログ:\n${meetingLog}`
        : transcript
          ? `会話ログ:\n${transcript}`
          : "会話ログ: (まだ会話がないため、現在のタスク前提から反証を出すこと)",
      notes ? `追加メモ:\n${notes}` : "",
      "出力形式:\n1. 反証ポイント(3件)\n2. 失敗シナリオ(2件)\n3. 追加検証クエリ(3件)",
    ].filter(Boolean);
    const contextualPrompt = withDemoContext(promptSections.join("\n\n"));
    if (!contextualPrompt) {
      return;
    }

    await sendMessage(
      { text: contextualPrompt },
      {
        body: {
          demo,
          provider,
          model,
          ...(chatModeOverride !== "auto" ? { modeOverride: chatModeOverride } : {}),
          approved: false,
        },
      },
    );

    setLoopStatus("悪魔の代弁者レビューを実行しました。");
  };

  const runAutonomousLoop = async () => {
    if (isStreaming || isAutoLoopRunning) {
      return;
    }

    autoLoopAbortRef.current = false;
    setIsAutoLoopRunning(true);
    setLoopStatus("自律ループを開始しました。");

    try {
      const loopSeed =
        demo === "meeting" && meetingTranscript.trim().length > 0 ? meetingTranscript : draft;
      const prompts = getAutonomousLoopPrompts(demo, loopSeed, selectedMeetingProfile);
      for (const [index, prompt] of prompts.entries()) {
        if (autoLoopAbortRef.current) {
          setLoopStatus("自律ループを停止しました。");
          break;
        }

        setLoopStatus(`自律ループ実行中 (${index + 1}/${prompts.length})`);
        await sendMessage(
          { text: withDemoContext(prompt) },
          {
            body: {
              demo,
              provider,
              model,
              ...(chatModeOverride !== "auto" ? { modeOverride: chatModeOverride } : {}),
              approved: false,
            },
          },
        );
        await wait(220);
      }

      if (!autoLoopAbortRef.current) {
        setLoopStatus("自律ループが完了しました。次ループ候補をArtifactsで確認してください。");
      }
    } catch (loopError) {
      setLoopStatus(
        `自律ループでエラーが発生しました: ${
          loopError instanceof Error ? loopError.message : "unknown error"
        }`,
      );
    } finally {
      autoLoopAbortRef.current = false;
      setIsAutoLoopRunning(false);
    }
  };

  const stopAutonomousLoop = () => {
    if (!isAutoLoopRunning) {
      return;
    }
    autoLoopAbortRef.current = true;
    stop();
    setLoopStatus("停止要求を受け付けました。");
  };

  const runScenario = async (scenario: DemoScenario) => {
    if (runningScenarioId) {
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
            body: {
              demo,
              provider,
              model,
              ...(chatModeOverride !== "auto" ? { modeOverride: chatModeOverride } : {}),
              approved: step.approved ?? false,
            },
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
        body: {
          demo,
          provider,
          model,
          ...(chatModeOverride !== "auto" ? { modeOverride: chatModeOverride } : {}),
          approved: true,
        },
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

  const applySuggestion = (suggestion: string) => {
    setDraft(suggestion);
  };

  const applyMeetingTemplate = () => {
    if (demo !== "meeting") {
      return;
    }
    setDraft(buildMeetingDraftTemplate(selectedMeetingProfile));
    setLoopStatus("会議タイプのテンプレートを入力欄に挿入しました。");
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

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm">
        <div className="border-b border-border/70 bg-gradient-to-r from-primary/18 via-chart-2/12 to-transparent px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex rounded-lg border border-border/70 bg-background/80 p-1">
                <Button
                  type="button"
                  variant={viewMode === "guided" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode("guided")}
                >
                  Guided
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "full" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setViewMode("full")}
                >
                  Full
                </Button>
              </div>
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "streaming" : "ready"}
              </Badge>
              {viewMode === "full" ? <Badge variant="outline">queue {queue.length}</Badge> : null}
              {viewMode === "full" ? <Badge variant="outline">artifacts {artifacts.length}</Badge> : null}
            </div>
          </div>

          {viewMode === "full" ? (
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
          {viewMode === "full" ? <Progress value={gateProgress} /> : null}
          {viewMode === "full" ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">plan {planProgress}%</Badge>
              <Badge variant="outline">task {taskProgress}%</Badge>
              <Badge variant="outline">interventions {approvalLogs.length}</Badge>
            </div>
          ) : null}
        </div>
      </header>

      {topPanel && viewMode === "full" ? (
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

      <div
        className={cn(
          "grid gap-4",
          viewMode === "guided"
            ? "xl:grid-cols-[280px_minmax(0,1fr)]"
            : "xl:grid-cols-[280px_minmax(0,1fr)_360px]",
        )}
      >
        <aside className="space-y-4">
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
                <p>まず Run Scenario で会話を生成し、中央で必要箇所だけ修正します。</p>
                {primaryScenario ? (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => void runScenario(primaryScenario)}
                    disabled={Boolean(runningScenarioId)}
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
                        <Button type="button" size="sm" className="mt-2 w-full" onClick={() => void runScenario(scenario)} disabled={Boolean(runningScenarioId)}>
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
        </aside>

        <section className="space-y-4">
          <Card className="gap-0 overflow-hidden border-border/70 py-0">
            <CardHeader className="space-y-2 border-b border-border/70 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Conversation</CardTitle>
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
                最短導線: 左列の Run Scenario で入力を生成し、ここで内容を編集して再送します。
              </p>
            </CardHeader>

            <Conversation className={cn("bg-muted/20", viewMode === "guided" ? "h-[420px]" : "h-[540px]")}>
              <ConversationContent className="gap-4 p-4">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="まだ会話はありません"
                    description="左のシナリオを実行するか、下の入力欄から開始してください。"
                  />
                ) : null}
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
                              {part.text}
                            </p>
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
                      <Shimmer>回答を生成しています...</Shimmer>
                    </MessageContent>
                  </Message>
                ) : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <CardContent className="space-y-3 border-t border-border/70 bg-background p-4">
              {viewMode === "full" || demo !== "meeting" ? (
                <div className="flex flex-wrap gap-2">
                  {displayedSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => applySuggestion(suggestion)}
                      className="bg-background"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              ) : null}

              {demo === "meeting" ? (
                viewMode === "guided" ? (
                  <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
                    <p className="text-xs font-semibold">3-step 会議レビュー</p>
                    <div className="mt-2 space-y-3 text-[11px]">
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground">1. 会議タイプを選択</p>
                        <Select value={meetingProfileId} onValueChange={setMeetingProfileId}>
                          <SelectTrigger className="h-8 bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEETING_PROFILES.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground">2. 議事録を貼り付け（任意）</p>
                        <Textarea
                          value={meetingTranscript}
                          onChange={(event) => setMeetingTranscript(event.target.value)}
                          placeholder="議事録を貼ると悪魔の代弁者レビューを実行できます"
                          className="min-h-20 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted-foreground">3. 実行</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={applyMeetingTemplate}
                            disabled={isStreaming}
                          >
                            テンプレ挿入
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void runScenario(buildMeetingScenario(selectedMeetingProfile))}
                            disabled={Boolean(runningScenarioId)}
                          >
                            会議タイプ実行
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void runDevilsAdvocate()}
                            disabled={isStreaming}
                          >
                            反証レビュー
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">Meeting Setup</p>
                          <p className="text-[11px] text-muted-foreground">
                            会議タイプを選ぶと、以降の回答はその会議目的に沿って生成されます。
                          </p>
                        </div>
                        <Badge variant="outline">meeting profile</Badge>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-[220px_1fr]">
                        <Select value={meetingProfileId} onValueChange={setMeetingProfileId}>
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEETING_PROFILES.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="rounded-md border border-border/70 bg-background px-2.5 py-2 text-[11px] text-muted-foreground">
                          <p>目的: {selectedMeetingProfile.objective}</p>
                          <p className="mt-1">参加者: {selectedMeetingProfile.participants}</p>
                          <p className="mt-1">期待成果: {selectedMeetingProfile.expectedOutput}</p>
                        </div>
                      </div>
                      <div className="mt-2 rounded-md border border-border/70 bg-background px-2.5 py-2 text-[11px]">
                        <p className="font-medium">この会議タイプの出力フォーマット</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {selectedMeetingProfile.keyTopics.map((topic) => (
                            <Badge key={topic} variant="outline" className="text-[10px]">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                        <ol className="mt-1 space-y-0.5 text-muted-foreground">
                          {selectedMeetingOutputTemplate.sections.map((section, index) => (
                            <li key={section}>
                              {index + 1}. {section}
                            </li>
                          ))}
                        </ol>
                        <p className="mt-1 text-muted-foreground">
                          次アクション表: {selectedMeetingOutputTemplate.actionColumns.join(" / ")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={applyMeetingTemplate}
                            disabled={isStreaming}
                          >
                            テンプレートを挿入
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void runScenario(buildMeetingScenario(selectedMeetingProfile))}
                            disabled={Boolean(runningScenarioId)}
                          >
                            この会議タイプを実行
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">Meeting Red-Team Agent</p>
                          <p className="text-[11px] text-muted-foreground">
                            議事録を貼り付けると、悪魔の代弁者として反証ポイントを抽出します。
                          </p>
                        </div>
                        <Badge variant="outline">devil&apos;s advocate</Badge>
                      </div>
                      <Textarea
                        value={meetingTranscript}
                        onChange={(event) => setMeetingTranscript(event.target.value)}
                        placeholder="ここに会議ログを貼り付けると、会話履歴より優先して反証レビューを実行します。"
                        className="mt-2 min-h-24 bg-background"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void runDevilsAdvocate()}
                          disabled={isStreaming}
                        >
                          議事録で反証実行
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setMeetingTranscript("")}
                          disabled={isStreaming || meetingTranscript.length === 0}
                        >
                          クリア
                        </Button>
                      </div>
                    </div>
                  </>
                )
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
                    <Button type="button" onClick={() => void send()} disabled={isStreaming}>
                      送信
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void runAutonomousLoop()}
                      disabled={isStreaming || isAutoLoopRunning}
                    >
                      {isAutoLoopRunning ? "自律ループ実行中..." : "自律ループ実行"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void runDevilsAdvocate()}
                      disabled={isStreaming}
                    >
                      悪魔の代弁者
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={isAutoLoopRunning ? stopAutonomousLoop : stop}
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
                  <Button type="button" onClick={() => void send()} disabled={isStreaming}>
                    送信
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void runAutonomousLoop()}
                    disabled={isStreaming || isAutoLoopRunning}
                  >
                    {isAutoLoopRunning ? "自律ループ実行中..." : "自律ループ実行"}
                  </Button>
                  {demo !== "meeting" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void runDevilsAdvocate()}
                      disabled={isStreaming}
                    >
                      悪魔の代弁者
                    </Button>
                  ) : null}
                  {isStreaming || isAutoLoopRunning ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={isAutoLoopRunning ? stopAutonomousLoop : stop}
                    >
                      停止
                    </Button>
                  ) : null}
                </div>
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

        {viewMode === "full" ? (
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
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={chatModeOverride}
                  onValueChange={(value) =>
                    setChatModeOverride(value as "auto" | "mock" | "live")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">chat mode: auto</SelectItem>
                    <SelectItem value="mock">chat mode: mock</SelectItem>
                    <SelectItem value="live">chat mode: live</SelectItem>
                  </SelectContent>
                </Select>
                <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-xs text-muted-foreground">
                  {chatModeOverride === "auto"
                    ? "auto はサーバーの DEMO_MODE に従います"
                    : `${chatModeOverride} を強制中`}
                </div>
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
                    <p>server mode: {runtimeInfo.demoMode}</p>
                    <p>OpenAI key: {runtimeInfo.hasOpenAIKey ? "configured" : "missing"}</p>
                    <p>Gemini key: {runtimeInfo.hasGeminiKey ? "configured" : "missing"}</p>
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
                      {tools.map((tool) => (
                        <div key={tool.id} className="rounded-md border bg-muted/30 p-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{tool.name}</p>
                            <span className={`rounded px-1.5 py-0.5 ${getStatusBadgeStyle(tool.status)}`}>
                              {tool.status}
                            </span>
                          </div>
                          <p className="mt-1 text-muted-foreground">{tool.detail}</p>
                        </div>
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

      {viewMode === "full" ? (
        <section className="grid gap-4 xl:grid-cols-[240px_1fr]">
          <Card className="gap-3 border-border/70 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Artifacts</CardTitle>
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
                <ArtifactAction onClick={() => void copyArtifact()} tooltip="Copy" disabled={!selectedArtifact}>
                  {selectedArtifact && copiedArtifactId === selectedArtifact.id ? "copied" : "copy"}
                </ArtifactAction>
                <ArtifactAction onClick={downloadArtifact} tooltip="Download" disabled={!selectedArtifact}>
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
        </section>
      ) : (
        <section className="space-y-2">
          {artifacts.length > 0 ? (
            <div className="max-w-xs">
              <Select value={selectedArtifact?.id ?? artifacts[0]?.id ?? ""} onValueChange={setSelectedArtifactId}>
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
                <ArtifactAction onClick={() => void copyArtifact()} tooltip="Copy" disabled={!selectedArtifact}>
                  {selectedArtifact && copiedArtifactId === selectedArtifact.id ? "copied" : "copy"}
                </ArtifactAction>
              </ArtifactActions>
            </ArtifactHeader>
            <ArtifactContent>
              {selectedArtifact ? (
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                  {selectedArtifact.content}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">成果物はまだありません。</p>
              )}
            </ArtifactContent>
          </ArtifactPanel>
        </section>
      )}

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
