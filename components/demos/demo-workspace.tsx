"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
  const [openInChatTarget, setOpenInChatTarget] = useState<"chatgpt" | "claude" | "v0">("chatgpt");
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

  const openInChat = () => {
    const query = encodeURIComponent(draft || "この案件の次アクションを整理してください。");
    const targetUrl =
      openInChatTarget === "chatgpt"
        ? `https://chatgpt.com/?q=${query}`
        : openInChatTarget === "claude"
          ? `https://claude.ai/new?q=${query}`
          : `https://v0.dev/chat?q=${query}`;

    window.open(targetUrl, "_blank", "noopener,noreferrer");
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
      <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-200">{subtitle}</p>
        </div>
        <div className="grid gap-2 border-t border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
          <div className="rounded border border-slate-200 bg-white p-2 text-xs">
            <p className="text-slate-500">Queue</p>
            <p className="text-sm font-semibold text-slate-900">{queue.length} items</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-2 text-xs">
            <p className="text-slate-500">Plan Progress</p>
            <p className="text-sm font-semibold text-slate-900">{planProgress}%</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-2 text-xs">
            <p className="text-slate-500">Task Progress</p>
            <p className="text-sm font-semibold text-slate-900">{taskProgress}%</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-2 text-xs">
            <p className="text-slate-500">Streaming Status</p>
            <p className="text-sm font-semibold text-slate-900">{status}</p>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Input to Approval
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {stageGates.map((stage) => (
              <span
                key={stage.id}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  stage.done
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-slate-300 bg-slate-100 text-slate-700"
                }`}
              >
                {stage.label}: {stage.done ? "done" : "waiting"}
              </span>
            ))}
          </div>
        </div>
      </header>

      {topPanel}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Queue</h2>
            <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
              <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-800">
                info: {queueSummary.info}
              </span>
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                warning: {queueSummary.warning}
              </span>
              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-red-800">
                critical: {queueSummary.critical}
              </span>
            </div>
            <ul className="mt-2 space-y-2">
              {queue.map((item) => (
                <li
                  key={item.id}
                  className={`rounded border p-2 text-xs ${getSeverityStyle(item.severity)}`}
                >
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p>{item.description}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.severity} / {item.timestamp}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Saved Sessions</h2>
            <button
              type="button"
              onClick={saveSession}
              className="mt-2 w-full rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
            >
              セッション保存
            </button>
            {sessionStatus ? <p className="mt-2 text-xs text-slate-600">{sessionStatus}</p> : null}
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {sessions.map((session) => (
                <li key={session.id} className="rounded border border-slate-200 p-2">
                  <p className="font-semibold text-slate-900">{session.title}</p>
                  <p>{session.modelProvider} / {session.modelId}</p>
                  <p className="text-[11px] text-slate-500">{session.updatedAt}</p>
                  <button
                    type="button"
                    onClick={() => void restoreSession(session.id)}
                    className="mt-1 rounded border border-slate-300 px-2 py-1 text-[11px]"
                  >
                    復元
                  </button>
                </li>
              ))}
              {sessions.length === 0 ? <li>保存済みセッションなし</li> : null}
            </ul>
          </section>
        </aside>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Conversation</h2>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                isStreaming ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
              }`}
            >
              {isStreaming ? "streaming..." : "ready"}
            </span>
          </div>
          <div className="max-h-[360px] space-y-2 overflow-auto rounded border border-slate-200 bg-slate-50 p-3">
            {messages.length === 0 ? <p className="text-xs text-slate-600">まだ会話はありません。</p> : null}
            {messages.map((message) => (
              <article
                key={message.id}
                className={`rounded p-2 text-sm ${
                  message.role === "user" ? "bg-white" : "bg-emerald-50"
                }`}
              >
                <p className="text-xs font-semibold text-slate-900">{message.role}</p>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <p key={`${message.id}-${index}`} className="mt-1 whitespace-pre-wrap text-slate-800">
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
                        className="mt-1 block text-xs text-blue-700 underline"
                      >
                        Source: {part.title ?? part.url}
                      </a>
                    );
                  }

                  if (part.type === "data-citation") {
                    return (
                      <p key={`${message.id}-${index}`} className="mt-1 text-xs text-slate-700">
                        根拠: {part.data.title}
                      </p>
                    );
                  }

                  return null;
                })}
              </article>
            ))}
            {isStreaming ? (
              <div className="space-y-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-300" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-slate-300" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-300" />
              </div>
            ) : null}
          </div>

          {scenarios.length > 0 ? (
            <section className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">1-click Demo Scenario</h3>
                {scenarioStatus ? <span className="text-[11px] text-slate-600">{scenarioStatus}</span> : null}
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="rounded border border-slate-200 bg-white p-2">
                    <p className="text-xs font-semibold text-slate-900">{scenario.title}</p>
                    <p className="mt-1 text-[11px] text-slate-600">{scenario.description}</p>
                    {scenario.outcome ? (
                      <p className="mt-1 text-[11px] text-slate-600">Outcome: {scenario.outcome}</p>
                    ) : null}
                    {scenario.targetDurationSec ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        target: {scenario.targetDurationSec}s
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-slate-500">steps: {scenario.steps.length}</p>
                    <div className="mt-2 h-1.5 rounded bg-slate-200">
                      <div
                        className="h-1.5 rounded bg-slate-900"
                        style={{
                          width: `${
                            scenario.steps.length === 0
                              ? 0
                              : Math.round(
                                  ((scenario.steps.filter(
                                    (step) =>
                                      scenarioStepStates[scenario.id]?.[step.id] === "done",
                                  ).length /
                                    scenario.steps.length) *
                                    100),
                                )
                          }%`,
                        }}
                      />
                    </div>
                    <ul className="mt-2 space-y-1">
                      {scenario.steps.map((step) => {
                        const stepStatus = scenarioStepStates[scenario.id]?.[step.id] ?? "pending";
                        return (
                          <li
                            key={step.id}
                            className="flex items-center justify-between gap-2 text-[11px] text-slate-700"
                          >
                            <span className="truncate">{step.label}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-medium ${getScenarioStepBadgeStyle(
                                stepStatus,
                              )}`}
                            >
                              {stepStatus}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {scenarioDurations[scenario.id] ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        last run: {scenarioDurations[scenario.id]}s
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void runScenario(scenario)}
                      disabled={Boolean(runningScenarioId)}
                      className="mt-2 rounded bg-slate-900 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {runningScenarioId === scenario.id ? "running..." : "Run"}
                    </button>
                  </div>
                ))}
              </div>
              {runningScenarioId ? (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={stopScenario}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700"
                  >
                    Stop Scenario
                  </button>
                  <span className="text-[11px] text-slate-600">elapsed: {scenarioElapsedSec}s</span>
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => applySuggestion(suggestion)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="入力してください"
            className="h-28 w-full rounded border border-slate-300 p-3 text-sm"
          />

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <label className="rounded border border-slate-300 px-2 py-1">
              添付
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => handleFileSelection(event.target.files)}
              />
            </label>
            {attachmentNames.length > 0 ? <span>{attachmentNames.join(", ")}</span> : <span>添付なし</span>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void send()}
              disabled={isStreaming}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              送信
            </button>
            <button
              type="button"
              onClick={stop}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              停止
            </button>
            <button
              type="button"
              onClick={createCheckpoint}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Checkpoint保存
            </button>
            <button
              type="button"
              onClick={openInChat}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Open in Chat
            </button>
            <select
              value={openInChatTarget}
              onChange={(event) =>
                setOpenInChatTarget(event.target.value as "chatgpt" | "claude" | "v0")
              }
              className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-700"
            >
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="v0">v0</option>
            </select>
          </div>

          {enableVoice ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">Voice Input</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={startVoiceInput}
                  className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                >
                  音声入力開始
                </button>
                <button
                  type="button"
                  onClick={stopVoiceInput}
                  className="rounded border border-slate-300 px-3 py-1 text-xs"
                >
                  停止
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600">状態: {voiceStatus}</p>
            </div>
          ) : null}

          {enableTts ? (
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">TTS Preview</p>
              <select
                value={ttsVoice}
                onChange={(event) => setTtsVoice(event.target.value)}
                className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="ja-JP-default">ja-JP-default</option>
                <option value="ja-JP-clear">ja-JP-clear</option>
                <option value="ja-JP-station">ja-JP-station</option>
              </select>
              <button
                type="button"
                onClick={() => void previewTts()}
                className="mt-2 rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white"
              >
                読み上げ確認
              </button>
              {ttsNote ? <p className="mt-1 text-xs text-slate-600">{ttsNote}</p> : null}
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-600">{error.message}</p> : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Model Selector</h2>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as ModelProvider)}
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            >
              {MODEL_OPTIONS[provider].map((modelOption) => (
                <option key={modelOption} value={modelOption}>
                  {modelOption}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600">status: {status}</p>
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Agent</p>
              <p>provider: {provider}</p>
              <p>model: {model}</p>
              <p>instructions: B2B workflow optimization</p>
              <p>tools: connectors / approval / artifacts</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Plan / Task</h2>
            <div className="mt-2 space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Plan</span>
                  <span>{planProgress}%</span>
                </div>
                <div className="h-2 rounded bg-slate-200">
                  <div className="h-2 rounded bg-slate-900" style={{ width: `${planProgress}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Task</span>
                  <span>{taskProgress}%</span>
                </div>
                <div className="h-2 rounded bg-slate-200">
                  <div className="h-2 rounded bg-emerald-600" style={{ width: `${taskProgress}%` }} />
                </div>
              </div>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {plan.map((step) => (
                <li key={step.id} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                  <span>{step.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${getStatusBadgeStyle(step.status)}`}>
                    {step.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold text-slate-900">Task</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-700">
              {tasks.map((task) => (
                <li key={task.id}>
                  <label className="flex items-center gap-1">
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
                    {task.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Tool Logs</h2>
            <ul className="mt-2 space-y-2 text-xs text-slate-700">
              {tools.map((tool) => (
                <li key={tool.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{tool.name}</p>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${getStatusBadgeStyle(tool.status)}`}>
                      {tool.status}
                    </span>
                  </div>
                  <p>{tool.detail}</p>
                </li>
              ))}
              {tools.length === 0 ? <li>ログなし</li> : null}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Context</h2>
            <p className="mt-1 text-xs text-slate-700">input tokens: {contextStats.inputTokens}</p>
            <p className="text-xs text-slate-700">output tokens: {contextStats.outputTokens}</p>
            <p className="text-xs text-slate-700">est. cost: ${contextStats.costUsd.toFixed(5)}</p>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full rounded bg-slate-200">
                <div
                  className="h-1.5 rounded bg-sky-600"
                  style={{ width: `${Math.min(100, Math.max(8, contextStats.inputTokens / 2))}%` }}
                />
              </div>
              <div className="h-1.5 w-full rounded bg-slate-200">
                <div
                  className="h-1.5 rounded bg-violet-600"
                  style={{ width: `${Math.min(100, Math.max(8, contextStats.outputTokens / 2))}%` }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Checkpoint</h2>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {checkpoints.map((checkpoint) => (
                <li key={checkpoint.id}>
                  <button
                    type="button"
                    onClick={() => restoreCheckpoint(checkpoint)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-left"
                  >
                    {checkpoint.label}
                  </button>
                </li>
              ))}
              {checkpoints.length === 0 ? <li>保存済みなし</li> : null}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Approval Ledger</h2>
            <ul className="mt-2 space-y-2 text-xs text-slate-700">
              {approvalLogs.map((log) => (
                <li key={log.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{log.action}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        log.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.status === "dismissed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-1">{log.reason}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{log.timestamp}</p>
                </li>
              ))}
              {approvalLogs.length === 0 ? <li>履歴なし</li> : null}
            </ul>
          </section>

          {approval?.required ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-sm">
              承認待ちアクションがあります。画面下部の Confirmation モーダルで確定してください。
            </section>
          ) : null}
        </aside>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Artifacts</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-[240px_1fr]">
          <ul className="space-y-1 text-xs text-slate-700">
            {artifacts.map((artifact) => (
              <li key={artifact.id}>
                <button
                  type="button"
                  onClick={() => setSelectedArtifactId(artifact.id)}
                  className={`w-full rounded px-2 py-1 text-left ${
                    selectedArtifact?.id === artifact.id
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300"
                  }`}
                >
                  {artifact.name}
                </button>
              </li>
            ))}
          </ul>

          <div className="rounded border border-slate-200 p-3">
            {selectedArtifact ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedArtifact.name}</p>
                    <p className="text-xs text-slate-500">updated: {selectedArtifact.updatedAt}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setArtifactViewMode("rendered")}
                      className={`rounded px-2 py-1 text-[11px] ${
                        artifactViewMode === "rendered" ? "bg-slate-900 text-white" : "border border-slate-300"
                      }`}
                    >
                      preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtifactViewMode("raw")}
                      className={`rounded px-2 py-1 text-[11px] ${
                        artifactViewMode === "raw" ? "bg-slate-900 text-white" : "border border-slate-300"
                      }`}
                    >
                      raw
                    </button>
                    <button
                      type="button"
                      onClick={copyArtifact}
                      className="rounded border border-slate-300 px-2 py-1 text-[11px]"
                    >
                      {copiedArtifactId === selectedArtifact.id ? "copied" : "copy"}
                    </button>
                    <button
                      type="button"
                      onClick={downloadArtifact}
                      className="rounded border border-slate-300 px-2 py-1 text-[11px]"
                    >
                      download
                    </button>
                  </div>
                </div>
                {artifactViewMode === "rendered" && selectedArtifact.kind === "html" ? (
                  <iframe
                    title={selectedArtifact.name}
                    srcDoc={selectedArtifact.content}
                    className="mt-2 h-48 w-full rounded border border-slate-200"
                  />
                ) : (
                  <pre className="mt-2 max-h-56 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                    {selectedArtifact.content}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-600">成果物はまだありません。</p>
            )}
          </div>
        </div>

        {citations.length > 0 ? (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">Sources / InlineCitation</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-slate-700">
              {citations.map((citation) => (
                <li key={citation.id}>
                  <a href={citation.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {citation.title}
                  </a>
                  {citation.quote ? ` - ${citation.quote}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {bottomPanel}

      {approval?.required ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Confirmation</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{approval.action}</h3>
            <p className="mt-2 text-sm text-slate-700">{approval.reason}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void approveCurrentAction()}
                className="rounded bg-amber-700 px-3 py-1.5 text-sm font-medium text-white"
              >
                承認して実行
              </button>
              <button
                type="button"
                onClick={dismissCurrentAction}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
