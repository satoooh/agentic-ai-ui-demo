import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  streamText,
} from "ai";
import { google, type GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google";
import { z } from "zod";
import { getMeetingSignals } from "@/lib/connectors/meeting-signal";
import { getRecruitingMarketJobs } from "@/lib/connectors/recruiting-market";
import { getResearchSignals } from "@/lib/connectors/research-signal";
import { getSalesAccountInsight } from "@/lib/connectors/sales-account";
import { resolveLanguageModel } from "@/lib/models";
import type { DemoId, DemoUIMessage, ModelProvider } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  messages: z.array(z.unknown()).optional(),
  demo: z.enum(["sales", "recruiting", "meeting", "research"]).default("meeting"),
  provider: z.enum(["openai", "gemini"]).default("openai"),
  model: z.string().optional(),
  approved: z.boolean().optional(),
  operation: z.enum(["default", "devils-advocate", "autonomous-loop", "scenario"]).optional(),
  meetingContext: z.string().optional(),
  meetingProfileId: z.string().optional(),
  meetingLog: z.string().optional(),
});

const structuredInsightSchema = z.object({
  headline: z.string().min(1).max(64),
  summary: z.string().min(1).max(280),
  keyPoints: z.array(z.string().min(1).max(140)).min(2).max(6),
  risks: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        impact: z.string().min(1).max(160),
        mitigation: z.string().min(1).max(160),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(5),
  actions: z
    .array(
      z.object({
        task: z.string().min(1).max(120),
        owner: z.string().min(1).max(80),
        due: z.string().min(1).max(80),
        metric: z.string().min(1).max(120),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(8),
  evidence: z
    .array(
      z.object({
        claim: z.string().min(1).max(140),
        support: z.string().min(1).max(180),
        nextCheck: z.string().min(1).max(140),
      }),
    )
    .max(6),
  worklog: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().min(1).max(120),
        detail: z.string().min(1).max(180),
        status: z.enum(["todo", "doing", "done"]),
        tags: z.array(z.string().min(1).max(40)).max(4),
      }),
    )
    .min(3)
    .max(6),
});

const microAgentInsightSchema = z.object({
  summary: z.string().min(1).max(220),
  keyFindings: z.array(z.string().min(1).max(140)).min(2).max(4),
  riskNote: z.string().min(1).max(180),
  nextAction: z.string().min(1).max(160),
});

type OperationType = "default" | "devils-advocate" | "autonomous-loop" | "scenario";
type MicroAgentRole = "observer" | "skeptic" | "operator";

const MICRO_AGENT_BRANCHES: Array<{
  role: MicroAgentRole;
  label: string;
  instruction: string;
}> = [
  {
    role: "observer",
    label: "Observer",
    instruction:
      "事実の棚卸しを担当し、欠落している前提や追加確認が必要なデータを先に列挙してください。",
  },
  {
    role: "skeptic",
    label: "Skeptic",
    instruction:
      "悪魔の代弁者として、前提崩壊シナリオと失敗時の影響を短く明示してください。",
  },
  {
    role: "operator",
    label: "Operator",
    instruction:
      "実行責任者として、今日動ける次アクションを優先順位つきで具体化してください。",
  },
];

interface ConnectorContext {
  label: string;
  summary: string;
  promptContext: string;
  citations: Array<{
    title: string;
    url: string;
    quote?: string;
  }>;
}

interface ResolvedMicroAgentInsight {
  role: MicroAgentRole;
  label: string;
  result: z.infer<typeof microAgentInsightSchema>;
}

function createStreamId(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
}

function compactText(value: string, maxLength = 120): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength)}…`;
}

function truncateForPrompt(value: string, maxLength = 2000): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated ${value.length - maxLength} chars]`;
}

function inferSalesOrg(latestText: string): string | undefined {
  const githubMatch = latestText.match(/github\.com\/([A-Za-z0-9-]+)/i);
  if (githubMatch?.[1]) {
    return githubMatch[1];
  }

  const labelMatch = latestText.match(
    /(?:org|organization|company|企業|会社)\s*[:：=]\s*([A-Za-z0-9-]{2,40})/i,
  );
  if (labelMatch?.[1]) {
    return labelMatch[1];
  }

  return undefined;
}

function inferTickerOrQuery(latestText: string, fallback: string): string {
  const ticker = latestText.match(/\b[A-Z]{2,5}\b/)?.[0];
  if (ticker) {
    return ticker;
  }

  const compact = compactText(latestText, 60);
  if (compact.length >= 2) {
    return compact;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSourceLinks(
  sources: unknown[] | undefined,
): Array<{ title: string; url: string; quote?: string; isPdf: boolean }> {
  if (!sources || sources.length === 0) {
    return [];
  }

  return sources
    .map((source, index) => {
      if (!isRecord(source)) {
        return null;
      }

      const url = typeof source.url === "string" ? source.url : null;
      if (!url || !url.startsWith("http")) {
        return null;
      }

      const title =
        typeof source.title === "string" && source.title.trim().length > 0
          ? source.title.trim()
          : `source-${index + 1}`;
      const snippet =
        typeof source.text === "string" && source.text.trim().length > 0
          ? source.text.trim()
          : typeof source.snippet === "string" && source.snippet.trim().length > 0
            ? source.snippet.trim()
            : undefined;
      const normalized = `${title} ${url}`.toLowerCase();
      const isPdf = normalized.includes(".pdf") || normalized.includes("pdf");

      const result: { title: string; url: string; quote?: string; isPdf: boolean } = {
        title,
        url,
        isPdf,
      };
      if (snippet) {
        result.quote = compactText(snippet, 90);
      }
      return result;
    })
    .filter((item): item is { title: string; url: string; quote?: string; isPdf: boolean } => item !== null);
}

async function resolveResearchConnectorWithGeminiSearch(
  query: string,
): Promise<ConnectorContext | null> {
  const geminiModelResult = resolveLanguageModel({
    provider: "gemini",
    model: "gemini-2.5-flash",
  });

  if (!geminiModelResult.ok) {
    return null;
  }

  try {
    const { text, sources, providerMetadata } = await generateText({
      model: geminiModelResult.model,
      tools: {
        google_search: google.tools.googleSearch({}),
      },
      prompt: [
        `企業調査クエリ: ${query}`,
        "Google検索で一次情報を収集してください。",
        "IR/決算資料/10-K/10-Q/企業公式ドキュメントを優先し、PDFリンクを優先して回答してください。",
        "最後に150文字以内で要約してください。",
      ].join("\n"),
      temperature: 0,
    });

    const sourceItems = extractSourceLinks(sources as unknown[] | undefined);
    if (sourceItems.length === 0) {
      return null;
    }

    const prioritizedSources = [...sourceItems].sort((a, b) => Number(b.isPdf) - Number(a.isPdf));
    const citations = prioritizedSources.slice(0, 6);
    const pdfCount = citations.filter((source) => source.isPdf).length;

    const metadata = providerMetadata?.google as GoogleGenerativeAIProviderMetadata | undefined;
    const groundingQueries = metadata?.groundingMetadata?.webSearchQueries?.slice(0, 3) ?? [];

    const promptContext = [
      `[Research Connector] query=${query}`,
      `searchProvider=gemini-google-search`,
      `groundingQueries=${groundingQueries.length > 0 ? groundingQueries.join(" | ") : query}`,
      `pdfLinks=${pdfCount}/${citations.length}`,
      ...citations.map(
        (source, index) =>
          `source${index + 1}: ${source.title} / ${source.url}${source.quote ? ` / ${source.quote}` : ""}`,
      ),
      `summary=${compactText(text, 180)}`,
    ].join("\n");

    return {
      label: "research-pdf-search",
      summary: `Gemini Web検索で根拠リンク ${citations.length} 件（PDF ${pdfCount} 件）を取得しました。`,
      promptContext,
      citations: citations.map((source) => ({
        title: source.title,
        url: source.url,
        quote: source.quote,
      })),
    };
  } catch {
    return null;
  }
}

async function resolveConnectorContext(input: {
  demo: DemoId;
  latestText: string;
  meetingProfileId?: string;
}): Promise<ConnectorContext> {
  if (input.demo === "sales") {
    const insight = await getSalesAccountInsight({
      org: inferSalesOrg(input.latestText),
    });

    const topRepos = insight.insight.topRepositories.slice(0, 3);
    const promptContext = [
      `[Sales Connector] org=${insight.insight.orgLogin}`,
      `displayName=${insight.insight.displayName}`,
      `followers=${insight.insight.followers}, publicRepos=${insight.insight.publicRepos}`,
      ...topRepos.map(
        (repo, index) =>
          `repo${index + 1}: ${repo.name} / stars=${repo.stars} / lang=${repo.language} / updated=${repo.updatedAt}`,
      ),
      `note=${insight.note}`,
    ].join("\n");

    return {
      label: "sales-account-connector",
      summary: insight.note,
      promptContext,
      citations: topRepos.map((repo) => ({
        title: `${insight.insight.displayName}: ${repo.name}`,
        url: repo.url,
        quote: `stars ${repo.stars} / ${repo.language}`,
      })),
    };
  }

  if (input.demo === "recruiting") {
    const query = inferTickerOrQuery(input.latestText, "engineer");
    const jobs = await getRecruitingMarketJobs({ query });
    const topJobs = jobs.jobs.slice(0, 5);
    const promptContext = [
      `[Recruiting Connector] query=${query}`,
      ...topJobs.map(
        (job, index) =>
          `job${index + 1}: ${job.title} / ${job.company} / ${job.location} / remote=${job.remote}`,
      ),
      `note=${jobs.note}`,
    ].join("\n");

    return {
      label: "recruiting-market-connector",
      summary: jobs.note,
      promptContext,
      citations: topJobs.map((job) => ({
        title: `${job.company}: ${job.title}`,
        url: job.url,
        quote: `${job.location}${job.remote ? " / remote" : ""}`,
      })),
    };
  }

  if (input.demo === "meeting") {
    const profileHint =
      input.meetingProfileId?.replaceAll("-", " ") ?? "meeting review";
    const query = compactText(`${profileHint} ${input.latestText}`, 60);
    const signals = await getMeetingSignals({ query });
    const topSignals = signals.signals.slice(0, 4);
    const promptContext = [
      `[Meeting Connector] query=${query}`,
      ...topSignals.map(
        (signal, index) =>
          `signal${index + 1}: ${signal.title} / points=${signal.points} / comments=${signal.comments}`,
      ),
      `note=${signals.note}`,
    ].join("\n");

    return {
      label: "meeting-signal-connector",
      summary: signals.note,
      promptContext,
      citations: topSignals.map((signal) => ({
        title: signal.title,
        url: signal.url,
        quote: signal.summary,
      })),
    };
  }

  const query = inferTickerOrQuery(input.latestText, "Microsoft");
  const geminiConnector = await resolveResearchConnectorWithGeminiSearch(query);
  if (geminiConnector) {
    return geminiConnector;
  }

  const research = await getResearchSignals({ query });
  const topSignals = research.signals.slice(0, 6);
  const sourceNote = research.sourceStatuses
    .map((status) => `${status.source}:${status.mode}/${status.count}`)
    .join(" | ");
  const promptContext = [
    `[Research Connector] query=${query}`,
    `sources=${sourceNote}`,
    ...topSignals.map(
      (signal, index) =>
        `signal${index + 1}: ${signal.source} / ${signal.kind} / ${signal.title} / score=${signal.score}`,
    ),
    `note=${research.note}`,
  ].join("\n");

  return {
    label: "research-signal-connector",
    summary: research.note,
    promptContext,
    citations: topSignals.map((signal) => ({
      title: `${signal.source.toUpperCase()} ${signal.title}`,
      url: signal.url,
      quote: signal.summary,
    })),
  };
}

function extractLatestText(messages: DemoUIMessage[]): string {
  const latest = messages.at(-1);
  if (!latest) {
    return "";
  }

  return latest.parts
    .filter((part): part is Extract<DemoUIMessage["parts"][number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function normalizeStepId(label: string, index: number): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? `step-${normalized}` : `step-${index + 1}`;
}

function toPlanSteps(worklog: z.infer<typeof structuredInsightSchema>["worklog"]) {
  return worklog.map((step, index) => ({
    id: step.id || normalizeStepId(step.label, index),
    title: step.label,
    status: step.status,
  }));
}

function toTaskItems(actions: z.infer<typeof structuredInsightSchema>["actions"]) {
  return actions.map((action, index) => ({
    id: `action-${index + 1}`,
    label: `${action.task}（担当: ${action.owner} / 期限: ${action.due} / 指標: ${action.metric}）`,
    done: false,
  }));
}

function buildStructuredArtifactMarkdown(
  structured: z.infer<typeof structuredInsightSchema>,
): string {
  const lines: string[] = [
    "# LLM Structured Summary",
    "",
    `## タイトル`,
    structured.headline,
    "",
    "## 要点サマリー",
    structured.summary,
    "",
    "## 重要な論点",
    ...structured.keyPoints.map((point) => `- ${point}`),
  ];

  if (structured.risks.length > 0) {
    lines.push(
      "",
      "## リスク",
      "| リスク | 影響 | 緩和策 | 優先度 |",
      "| --- | --- | --- | --- |",
      ...structured.risks.map(
        (risk) =>
          `| ${risk.title} | ${risk.impact} | ${risk.mitigation} | ${risk.severity} |`,
      ),
    );
  }

  if (structured.actions.length > 0) {
    lines.push(
      "",
      "## 次アクション",
      "| タスク | 担当 | 期限 | 検証指標 | 優先度 |",
      "| --- | --- | --- | --- | --- |",
      ...structured.actions.map(
        (action) =>
          `| ${action.task} | ${action.owner} | ${action.due} | ${action.metric} | ${action.priority} |`,
      ),
    );
  }

  if (structured.evidence.length > 0) {
    lines.push(
      "",
      "## 根拠と追加確認",
      ...structured.evidence.map(
        (evidence) =>
          `- **主張**: ${evidence.claim}\n  - 根拠: ${evidence.support}\n  - 次確認: ${evidence.nextCheck}`,
      ),
    );
  }

  return lines.join("\n");
}

function buildStructuredExtractionPrompt(input: {
  demo: DemoId;
  operation?: OperationType;
  latestUserText: string;
  assistantMarkdown: string;
  meetingContext?: string;
  meetingLog?: string;
  connectorContext?: string;
  microAgentInsights?: ResolvedMicroAgentInsight[];
}): string {
  const operationNote =
    input.operation === "devils-advocate"
      ? "悪魔の代弁者として、前提の穴と失敗シナリオを強めに抽出してください。"
    : input.operation === "autonomous-loop"
        ? input.demo === "meeting"
          ? "会議レビューAI向けに、会議後の実行項目と優先順位を明確化してください。"
          : "自律ループ向けに、次ループの実行項目を明確化してください。"
        : input.operation === "scenario"
          ? "シナリオ実行中なので、ステップ進捗と次打ち手を優先してください。"
          : "通常応答として、実行可能なアウトプットに整理してください。";

  const meetingContextBlock = input.meetingContext
    ? `\n\n会議コンテキスト:\n${input.meetingContext}`
    : "";
  const meetingLogBlock = input.meetingLog ? `\n\n会議ログ:\n${input.meetingLog}` : "";
  const connectorBlock = input.connectorContext
    ? `\n\n収集した外部コンテキスト:\n${input.connectorContext}`
    : "";
  const microAgentBlock =
    input.microAgentInsights && input.microAgentInsights.length > 0
      ? `\n\n並列マイクロエージェント結果:\n${input.microAgentInsights
          .map(
            (insight) =>
              `- [${insight.label}] ${insight.result.summary}\n  findings: ${insight.result.keyFindings.join(
                " / ",
              )}\n  risk: ${insight.result.riskNote}\n  action: ${insight.result.nextAction}`,
          )
          .join("\n")}`
      : "";

  return [
    `デモ種別: ${input.demo}`,
    `操作種別: ${input.operation ?? "default"}`,
    operationNote,
    "",
    "headline は 18〜32文字程度の短いタイトルにしてください（会議なら議題＋焦点）。",
    "",
    "ユーザーの直近入力:",
    input.latestUserText,
    "",
    "アシスタント最終出力（Markdown）:",
    input.assistantMarkdown,
    "",
    "上記から、重複を避けて構造化してください。曖昧なら「未定」と明示してください。",
  ].join("\n") + meetingContextBlock + meetingLogBlock + connectorBlock + microAgentBlock;
}

function buildSystemPrompt(input: {
  demo: DemoId;
  operation?: OperationType;
  meetingContext?: string;
  meetingLog?: string;
  connectorContext?: string;
}): string {
  const common =
    "あなたは業務オペレーション向けのAIアシスタントです。日本語で簡潔に、読みやすい構造で回答してください。";
  const readableFormat =
    input.demo === "meeting"
      ? "出力はMarkdown形式で、必ず以下の順で:\n" +
        "## TL;DR（3行以内）\n" +
        "## 決定事項 / 未決事項\n" +
        "## 反証レビュー（失敗シナリオ2件 + 早期検知シグナル）\n" +
        "## 次アクション（表形式。列: タスク / 担当 / 期限 / 成功条件）\n" +
        "## 次回会議までの確認項目"
      : input.demo === "research"
        ? "出力はMarkdown形式で、必ず以下の順で:\n" +
          "## TL;DR（3行以内）\n" +
          "## 重要示唆（事実ベース）\n" +
          "## 反証レビュー（失敗シナリオ2件）\n" +
          "## 次アクション（表形式。列: タスク / 担当 / 期限 / 検証指標）\n" +
          "## 根拠リンク（最低3件、PDF優先）"
        : "出力はMarkdown形式で、必ず以下の順で:\n" +
          "## 要点サマリー（3行以内）\n" +
          "## 重要な論点（箇条書き）\n" +
          "## 次アクション（表形式。列: タスク / 担当 / 期限 / 検証指標）\n" +
          "## 反証・リスク（最低2件）\n" +
          "## 不足データと次回確認";

  const op =
    input.operation === "devils-advocate"
      ? "今回は悪魔の代弁者として、前提の穴・失敗シナリオ・追加検証を優先して示してください。"
    : input.operation === "autonomous-loop"
        ? input.demo === "meeting"
          ? "今回は会議レビューAIの実行中です。会議後の実行確度を上げるため、直前の結果を踏まえて次の一手を明確に更新してください。"
          : "今回は自律ループ中です。直前の結果を踏まえて次の一手を明確に更新してください。"
        : input.operation === "scenario"
          ? "今回はシナリオ実行中です。現在ステップの目的に集中し、冗長な説明は避けてください。"
          : "今回の依頼に対して、実行可能な提案を短く返してください。";

  const meetingContextBlock =
    input.demo === "meeting" && input.meetingContext
      ? `\n\n会議コンテキスト:\n${input.meetingContext}`
      : "";
  const meetingLogBlock =
    input.demo === "meeting" && input.meetingLog
      ? `\n\n会議ログ（参照用）:\n${input.meetingLog}`
      : "";
  const connectorBlock = input.connectorContext
    ? `\n\n外部ツールで取得したファクト:\n${input.connectorContext}`
    : "";

  return [common, readableFormat, op].join("\n\n") + meetingContextBlock + meetingLogBlock + connectorBlock;
}

function buildMicroAgentPrompt(input: {
  branch: (typeof MICRO_AGENT_BRANCHES)[number];
  demo: DemoId;
  operation?: OperationType;
  latestUserText: string;
  assistantMarkdown: string;
  connectorContext?: string;
}) {
  const connectorBlock = input.connectorContext
    ? `\n\n外部コンテキスト:\n${truncateForPrompt(input.connectorContext, 1200)}`
    : "";

  return [
    `あなたは ${input.branch.label} です。`,
    input.branch.instruction,
    `デモ種別: ${input.demo}`,
    `操作種別: ${input.operation ?? "default"}`,
    "",
    "ユーザー直近入力:",
    truncateForPrompt(input.latestUserText, 700),
    "",
    "アシスタント最終出力:",
    truncateForPrompt(input.assistantMarkdown, 1600),
    "",
    "上記から、あなたの担当観点で結論を圧縮してください。",
  ].join("\n") + connectorBlock;
}

function buildMicroAgentArtifactMarkdown(
  insights: ResolvedMicroAgentInsight[],
): string {
  const lines: string[] = ["# Agentic Orchestration", ""];

  for (const insight of insights) {
    lines.push(
      `## ${insight.label}`,
      `- Summary: ${insight.result.summary}`,
      `- Findings: ${insight.result.keyFindings.join(" / ")}`,
      `- Risk: ${insight.result.riskNote}`,
      `- Next: ${insight.result.nextAction}`,
      "",
    );
  }

  return lines.join("\n").trim();
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const messages = (parsed.data.messages ?? []) as DemoUIMessage[];
  const latestText = extractLatestText(messages);
  const meetingLog = parsed.data.meetingLog?.trim() ?? "";
  const requestedProvider = parsed.data.provider as ModelProvider;
  let resolvedProvider = requestedProvider;
  let modelResult = resolveLanguageModel({
    provider: requestedProvider,
    model: parsed.data.model,
  });
  let providerFallbackNote: string | null = null;

  if (!modelResult.ok) {
    const fallbackProvider: ModelProvider =
      requestedProvider === "openai" ? "gemini" : "openai";
    const fallbackResult = resolveLanguageModel({
      provider: fallbackProvider,
      model: undefined,
    });

    if (fallbackResult.ok) {
      resolvedProvider = fallbackProvider;
      modelResult = fallbackResult;
      providerFallbackNote = `${requestedProvider} が未設定のため ${fallbackProvider} に自動切替しました。`;
    }
  }

  if (!modelResult.ok) {
    return new Response(
      JSON.stringify({
        error: "Model configuration error",
        message:
          modelResult.reason ??
          "LLMの設定が不正です。OPENAI_API_KEY または GOOGLE_GENERATIVE_AI_API_KEY とモデル設定を確認してください。",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  if (!latestText) {
    return new Response(
      JSON.stringify({ error: "Empty message", message: "送信内容が空です。" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  if (parsed.data.demo === "meeting" && meetingLog.length < 20) {
    return new Response(
      JSON.stringify({
        error: "Missing meeting transcript",
        message: "会議レビューでは議事録入力（20文字以上）が必須です。Step 1 で入力してください。",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const operation: OperationType = parsed.data.operation ?? "default";

  const stream = createUIMessageStream<DemoUIMessage>({
    execute: async ({ writer }) => {
      let connectorContext: ConnectorContext | null = null;
      const connectorStartedIso = new Date().toISOString();
      const connectorRunningId = createStreamId("tool-connector");
      writer.write({
        type: "data-tool",
        id: connectorRunningId,
        data: {
          id: connectorRunningId,
          name: "connector-fetch",
          status: "running",
          detail: "外部データソースを確認しています。",
          timestamp: connectorStartedIso,
        },
        transient: true,
      });

      try {
        connectorContext = await resolveConnectorContext({
          demo: parsed.data.demo,
          latestText,
          meetingProfileId: parsed.data.meetingProfileId,
        });

        const connectorDoneId = createStreamId("tool-connector-done");
        writer.write({
          type: "data-tool",
          id: connectorDoneId,
          data: {
            id: connectorDoneId,
            name: connectorContext.label,
            status: "success",
            detail: connectorContext.summary,
            timestamp: new Date().toISOString(),
          },
          transient: true,
        });

        writer.write({
          type: "data-queue",
          id: createStreamId("queue-connector"),
          data: {
            id: `queue-${parsed.data.demo}-connector`,
            title: "外部データ取得",
            description: connectorContext.summary,
            severity: "info",
            timestamp: new Date().toLocaleTimeString("ja-JP"),
          },
          transient: true,
        });

        for (const [index, citation] of connectorContext.citations.slice(0, 4).entries()) {
          writer.write({
            type: "data-citation",
            id: createStreamId("citation-connector"),
            data: {
              id: `citation-${parsed.data.demo}-connector-${index + 1}`,
              title: citation.title,
              url: citation.url,
              quote: citation.quote,
            },
            transient: true,
          });
        }
      } catch (connectorError) {
        const connectorErrorId = createStreamId("tool-connector-error");
        writer.write({
          type: "data-tool",
          id: connectorErrorId,
          data: {
            id: connectorErrorId,
            name: "connector-fetch",
            status: "error",
            detail:
              connectorError instanceof Error
                ? `外部データ取得に失敗: ${connectorError.message}`
                : "外部データ取得に失敗しました。",
            timestamp: new Date().toISOString(),
          },
          transient: true,
        });
      }

      const startedAtIso = new Date().toISOString();
      const modelRunningId = createStreamId("tool-model");
      writer.write({
        type: "data-tool",
        id: modelRunningId,
        data: {
          id: modelRunningId,
          name: "model-call",
          status: "running",
          detail: `${resolvedProvider}/${modelResult.resolvedModel} で推論を開始しました。${
            providerFallbackNote ?? ""
          }`,
          timestamp: startedAtIso,
        },
        transient: true,
      });

      const result = streamText({
        model: modelResult.model,
        system: buildSystemPrompt({
          demo: parsed.data.demo,
          operation,
          meetingContext: parsed.data.meetingContext,
          meetingLog,
          connectorContext: connectorContext?.promptContext,
        }),
        messages: await convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());

      const assistantMarkdown = (await result.text).trim();
      const modelFinishedIso = new Date().toISOString();
      const modelDoneId = createStreamId("tool-model-done");
      writer.write({
        type: "data-tool",
        id: modelDoneId,
        data: {
          id: modelDoneId,
          name: "model-call",
          status: "success",
          detail: "推論が完了しました。並列エージェントでレビューを実行します。",
          timestamp: modelFinishedIso,
        },
        transient: true,
      });

      if (!assistantMarkdown) {
        const structuredEmptyId = createStreamId("tool-structured-empty");
        writer.write({
          type: "data-tool",
          id: structuredEmptyId,
          data: {
            id: structuredEmptyId,
            name: "structured-output",
            status: "error",
            detail: "モデル出力が空のため構造化をスキップしました。",
            timestamp: new Date().toISOString(),
          },
          transient: true,
        });
        return;
      }

      const orchestrationRunId = createStreamId("tool-orchestration");
      writer.write({
        type: "data-tool",
        id: orchestrationRunId,
        data: {
          id: orchestrationRunId,
          name: "multi-agent-orchestration",
          status: "running",
          detail: "Observer / Skeptic / Operator を並列実行しています。",
          timestamp: new Date().toISOString(),
        },
        transient: true,
      });

      const microAgentSettled = await Promise.all(
        MICRO_AGENT_BRANCHES.map(async (branch) => {
          const branchId = createStreamId(`tool-branch-${branch.role}`);
          writer.write({
            type: "data-tool",
            id: branchId,
            data: {
              id: branchId,
              name: `branch-${branch.role}`,
              status: "running",
              detail: `${branch.label} が観点別レビューを実行しています。`,
              timestamp: new Date().toISOString(),
            },
            transient: true,
          });

          try {
            const branchResult = await generateObject({
              model: modelResult.model,
              schema: microAgentInsightSchema,
              prompt: buildMicroAgentPrompt({
                branch,
                demo: parsed.data.demo,
                operation,
                latestUserText: latestText,
                assistantMarkdown,
                connectorContext: connectorContext?.promptContext,
              }),
              temperature: 0,
            });

            const branchDoneId = createStreamId(`tool-branch-${branch.role}-done`);
            writer.write({
              type: "data-tool",
              id: branchDoneId,
              data: {
                id: branchDoneId,
                name: `branch-${branch.role}`,
                status: "success",
                detail: `${branch.label}: ${branchResult.object.summary}`,
                timestamp: new Date().toISOString(),
              },
              transient: true,
            });

            return {
              role: branch.role,
              label: branch.label,
              result: branchResult.object,
            } satisfies ResolvedMicroAgentInsight;
          } catch (branchError) {
            const branchErrorId = createStreamId(`tool-branch-${branch.role}-error`);
            writer.write({
              type: "data-tool",
              id: branchErrorId,
              data: {
                id: branchErrorId,
                name: `branch-${branch.role}`,
                status: "error",
                detail:
                  branchError instanceof Error
                    ? `${branch.label} が失敗: ${branchError.message}`
                    : `${branch.label} が失敗しました。`,
                timestamp: new Date().toISOString(),
              },
              transient: true,
            });
            return null;
          }
        }),
      );

      const microAgentInsights = microAgentSettled.filter(
        (insight): insight is ResolvedMicroAgentInsight => insight !== null,
      );

      if (microAgentInsights.length > 0) {
        writer.write({
          type: "data-artifact",
          id: createStreamId("artifact-orchestration"),
          data: {
            id: `orchestration-summary-${parsed.data.demo}`,
            name: "orchestration-summary.md",
            kind: "markdown",
            content: buildMicroAgentArtifactMarkdown(microAgentInsights),
            updatedAt: new Date().toISOString(),
          },
          transient: true,
        });
      }

      const orchestrationDoneId = createStreamId("tool-orchestration-done");
      writer.write({
        type: "data-tool",
        id: orchestrationDoneId,
        data: {
          id: orchestrationDoneId,
          name: "multi-agent-orchestration",
          status: microAgentInsights.length > 0 ? "success" : "error",
          detail:
            microAgentInsights.length > 0
              ? `並列レビュー完了（${microAgentInsights.length}/${MICRO_AGENT_BRANCHES.length}）`
              : "並列レビューが失敗しました。",
          timestamp: new Date().toISOString(),
        },
        transient: true,
      });

      const structuredRunningId = createStreamId("tool-structured");
      writer.write({
        type: "data-tool",
        id: structuredRunningId,
        data: {
          id: structuredRunningId,
          name: "structured-output",
          status: "running",
          detail: "並列レビューを集約して、要点/リスク/次アクションを抽出しています。",
          timestamp: new Date().toISOString(),
        },
        transient: true,
      });

      try {
        const structured = await generateObject({
          model: modelResult.model,
          schema: structuredInsightSchema,
          prompt: buildStructuredExtractionPrompt({
            demo: parsed.data.demo,
            operation,
            latestUserText: latestText,
            assistantMarkdown,
            meetingContext: parsed.data.meetingContext,
            meetingLog,
            connectorContext: connectorContext?.promptContext,
            microAgentInsights,
          }),
          temperature: 0,
        });

        const structuredData = structured.object;
        const nowIso = new Date().toISOString();

        writer.write({
          type: "data-structured",
          id: createStreamId("structured"),
          data: structuredData,
          transient: true,
        });

        writer.write({
          type: "data-plan",
          id: createStreamId("plan"),
          data: {
            steps: toPlanSteps(structuredData.worklog),
          },
          transient: true,
        });

        writer.write({
          type: "data-task",
          id: createStreamId("task"),
          data: {
            items: toTaskItems(structuredData.actions),
          },
          transient: true,
        });

        writer.write({
          type: "data-artifact",
          id: createStreamId("artifact-structured"),
          data: {
            id: `llm-structured-summary-${parsed.data.demo}`,
            name: "llm-structured-summary.md",
            kind: "markdown",
            content: buildStructuredArtifactMarkdown(structuredData),
            updatedAt: nowIso,
          },
          transient: true,
        });

        const structuredDoneId = createStreamId("tool-structured-done");
        writer.write({
          type: "data-tool",
          id: structuredDoneId,
          data: {
            id: structuredDoneId,
            name: "structured-output",
            status: "success",
            detail:
              "構造化サマリを更新しました。TL;DR / Agent Worklog / Artifacts を確認してください。",
            timestamp: nowIso,
          },
          transient: true,
        });
      } catch (structuredError) {
        const structuredErrorId = createStreamId("tool-structured-error");
        writer.write({
          type: "data-tool",
          id: structuredErrorId,
          data: {
            id: structuredErrorId,
            name: "structured-output",
            status: "error",
            detail:
              structuredError instanceof Error
                ? `構造化出力の生成に失敗しました: ${structuredError.message}`
                : "構造化出力の生成に失敗しました。",
            timestamp: new Date().toISOString(),
          },
          transient: true,
        });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
