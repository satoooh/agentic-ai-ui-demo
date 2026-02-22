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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        id: "approval",
        label: "Approval",
        done: approvalLogs.some((log) => log.status === "approved"),
      },
    ],
    [messages, plan.length, tasks.length, tools.length, artifacts.length, approvalLogs],
  );

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
          approved: false,
        },
      },
    );

    setDraft("");
    setAttachmentNames([]);
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
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-700 p-6 text-white">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{queue.length} queue</Badge>
            <Badge variant="secondary">plan {planProgress}%</Badge>
            <Badge variant="secondary">task {taskProgress}%</Badge>
            <Badge variant="secondary">{isStreaming ? "streaming" : "ready"}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t bg-muted/30 px-4 py-3">
          {stageGates.map((stage) => (
            <Badge key={stage.id} variant={stage.done ? "default" : "outline"}>
              {stage.label}: {stage.done ? "done" : "waiting"}
            </Badge>
          ))}
        </div>
      </header>

      {topPanel}

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_320px]">
        <aside className="space-y-4">
          <QueuePanel>
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Queue</p>
              <div className="flex gap-1 text-xs">
                <Badge variant="outline">i {queueSummary.info}</Badge>
                <Badge variant="outline">w {queueSummary.warning}</Badge>
                <Badge variant="outline">c {queueSummary.critical}</Badge>
              </div>
            </div>
            <QueueList className="mt-1">
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

          {scenarios.length > 0 ? (
            <Card className="gap-3 py-4">
              <CardHeader className="px-4">
                <CardTitle className="text-sm">1-click Demo Scenario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="rounded-lg border bg-background p-2">
                    <p className="text-xs font-semibold">{scenario.title}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{scenario.description}</p>
                    <div className="mt-2 h-1.5 rounded bg-muted">
                      <div
                        className="h-1.5 rounded bg-primary"
                        style={{
                          width: `${
                            scenario.steps.length === 0
                              ? 0
                              : Math.round(
                                  (scenario.steps.filter(
                                    (step) => scenarioStepStates[scenario.id]?.[step.id] === "done",
                                  ).length /
                                    scenario.steps.length) *
                                    100,
                                )
                          }%`,
                        }}
                      />
                    </div>
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
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => void runScenario(scenario)}
                      disabled={Boolean(runningScenarioId)}
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

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Saved Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              <Button type="button" className="w-full" onClick={saveSession}>
                セッション保存
              </Button>
              {sessionStatus ? <p className="text-xs text-muted-foreground">{sessionStatus}</p> : null}
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border p-2 text-xs">
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
                {sessions.length === 0 ? <p className="text-xs text-muted-foreground">保存済みセッションなし</p> : null}
              </div>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex items-center justify-between border-b px-4 py-3">
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
            </CardHeader>

            <Conversation className="h-[430px] bg-muted/25">
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

            <CardContent className="space-y-3 border-t bg-background p-4">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder="メッセージを入力（Cmd/Ctrl + Enter で送信 / Esc で停止）"
                className="h-28 w-full rounded-lg border bg-background p-3 text-sm outline-none ring-0 focus-visible:border-primary"
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
                  <Button type="button" variant="outline" onClick={stop}>
                    停止
                  </Button>
                  <Button type="button" variant="outline" onClick={createCheckpoint}>
                    Checkpoint保存
                  </Button>
                </div>
              </div>

              {(enableVoice || enableTts) ? (
                <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 md:grid-cols-2">
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
                      <select
                        value={ttsVoice}
                        onChange={(event) => setTtsVoice(event.target.value)}
                        className="mt-2 w-full rounded-md border bg-background px-2 py-1 text-xs"
                      >
                        <option value="ja-JP-default">ja-JP-default</option>
                        <option value="ja-JP-clear">ja-JP-clear</option>
                        <option value="ja-JP-station">ja-JP-station</option>
                      </select>
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

        <aside className="space-y-4">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Model & Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as ModelProvider)}
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
              >
                {MODEL_OPTIONS[provider].map((modelOption) => (
                  <option key={modelOption} value={modelOption}>
                    {modelOption}
                  </option>
                ))}
              </select>
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

          <Plan defaultOpen isStreaming={isStreaming}>
            <PlanHeader>
              <div>
                <PlanTitle>Execution Plan</PlanTitle>
                <PlanDescription>進捗を見ながら承認ポイントを管理します。</PlanDescription>
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

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Task</CardTitle>
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

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Tool Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 text-xs">
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
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
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
            </CardContent>
          </Card>

          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-sm">Approval Ledger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 text-xs">
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
              {approvalLogs.length === 0 ? <p className="text-muted-foreground">履歴なし</p> : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <section className="grid gap-4 xl:grid-cols-[240px_1fr]">
        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Artifacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 px-4">
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
