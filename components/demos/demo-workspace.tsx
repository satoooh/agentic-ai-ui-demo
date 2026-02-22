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
  const [chatModeOverride, setChatModeOverride] = useState<"auto" | "mock" | "live">("auto");
  const [provider, setProvider] = useState<ModelProvider>("openai");
  const [model, setModel] = useState(getDefaultModel("openai"));
  const [draft, setDraft] = useState("");
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
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

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

  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[0],
    [artifacts, selectedArtifactId],
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

  const send = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const finalText = attachmentNames.length
      ? `${trimmed}\n\n添付ファイル: ${attachmentNames.join(", ")}`
      : trimmed;

    await sendMessage(
      { text: finalText },
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
    const notes = draft.trim();

    const basePrompt =
      "あなたは悪魔の代弁者エージェントです。以下の会話ログを読み、" +
      "前提の穴・反証シナリオ・失敗時の影響・追加で取るべき検証データを、日本語で簡潔に出してください。";
    const promptSections = [
      basePrompt,
      transcript ? `会話ログ:\n${transcript}` : "会話ログ: (まだ会話がないため、現在のタスク前提から反証を出すこと)",
      notes ? `追加メモ:\n${notes}` : "",
      "出力形式:\n1. 反証ポイント(3件)\n2. 失敗シナリオ(2件)\n3. 追加検証クエリ(3件)",
    ].filter(Boolean);

    await sendMessage(
      { text: promptSections.join("\n\n") },
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
          { text: step.prompt },
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
        <div className="border-b border-border/70 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "streaming" : "ready"}
              </Badge>
              <Badge variant="outline">queue {queue.length}</Badge>
              <Badge variant="outline">artifacts {artifacts.length}</Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {stageGates.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  stage.done
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                    : "border-border/70 bg-background/80 text-muted-foreground",
                )}
              >
                <p className="text-[11px] uppercase tracking-wide">{stage.label}</p>
                <p className="mt-1 font-semibold">{stage.done ? "done" : "waiting"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 px-5 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Stage completion: {completedGateCount}/{stageGates.length}
            </span>
            <span>{gateProgress}%</span>
          </div>
          <Progress value={gateProgress} />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">plan {planProgress}%</Badge>
            <Badge variant="outline">task {taskProgress}%</Badge>
            <Badge variant="outline">interventions {approvalLogs.length}</Badge>
          </div>
        </div>
      </header>

      {topPanel ? (
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

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className="space-y-4">
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
                <QueueList className="mt-0 p-3 [&>div]:max-h-[260px]">
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

          {scenarios.length > 0 ? (
            <Card className="gap-3 border-border/70 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">1-click Demo Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4">
                <ScrollArea className="h-[350px] pr-2">
                  <div className="space-y-2">
                    {scenarios.map((scenario) => (
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
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                最短導線: 左列の Run Scenario で入力を生成し、ここで内容を編集して再送します。
              </p>
            </CardHeader>

            <Conversation className="h-[500px] bg-muted/20">
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
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
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

              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder="メッセージを入力（Cmd/Ctrl + Enter で送信 / Esc で停止）"
                className="min-h-24 resize-y"
              />

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
                    onClick={() => void runDevilsAdvocate()}
                    disabled={isStreaming}
                  >
                    悪魔の代弁者
                  </Button>
                  <Button type="button" variant="outline" onClick={stop}>
                    停止
                  </Button>
                  <Button type="button" variant="outline" onClick={createCheckpoint}>
                    Checkpoint保存
                  </Button>
                </div>
              </div>

              {(enableVoice || enableTts) ? (
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
            </CardContent>
          </Card>

          <Tabs defaultValue="execution">
            <TabsList className="w-full bg-muted/40">
              <TabsTrigger value="execution">Execution</TabsTrigger>
              <TabsTrigger value="ops">Ops</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ops" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
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
            </TabsContent>
          </Tabs>
        </aside>
      </div>

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

      {citations.length > 0 ? (
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

      {bottomPanel}

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
