import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamText,
} from "ai";
import { z } from "zod";
import { resolveLanguageModel } from "@/lib/models";
import type { DemoId, DemoUIMessage, ModelProvider } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  messages: z.array(z.unknown()).optional(),
  demo: z.enum(["sales", "recruiting", "meeting", "research"]).default("sales"),
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
  operation?: "default" | "devils-advocate" | "autonomous-loop" | "scenario";
  latestUserText: string;
  assistantMarkdown: string;
  meetingContext?: string;
  meetingLog?: string;
}): string {
  const operationNote =
    input.operation === "devils-advocate"
      ? "悪魔の代弁者として、前提の穴と失敗シナリオを強めに抽出してください。"
      : input.operation === "autonomous-loop"
        ? "自律ループ向けに、次ループの実行項目を明確化してください。"
        : input.operation === "scenario"
          ? "シナリオ実行中なので、ステップ進捗と次打ち手を優先してください。"
          : "通常応答として、実行可能なアウトプットに整理してください。";

  const meetingContextBlock = input.meetingContext
    ? `\n\n会議コンテキスト:\n${input.meetingContext}`
    : "";
  const meetingLogBlock = input.meetingLog ? `\n\n会議ログ:\n${input.meetingLog}` : "";

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
  ].join("\n") + meetingContextBlock + meetingLogBlock;
}

function buildSystemPrompt(input: {
  demo: DemoId;
  operation?: "default" | "devils-advocate" | "autonomous-loop" | "scenario";
  meetingContext?: string;
  meetingLog?: string;
}): string {
  const common =
    "あなたは業務オペレーション向けのAIアシスタントです。日本語で簡潔に、読みやすい構造で回答してください。";
  const readableFormat =
    "出力はMarkdown形式で、必ず以下の順で:\n" +
    "## 要点サマリー（3行以内）\n" +
    "## 重要な論点（箇条書き）\n" +
    "## 次アクション（表形式。列: タスク / 担当 / 期限 / 検証指標）\n" +
    "## 反証・リスク（最低2件）\n" +
    "## 不足データと次回確認";

  const op =
    input.operation === "devils-advocate"
      ? "今回は悪魔の代弁者として、前提の穴・失敗シナリオ・追加検証を優先して示してください。"
      : input.operation === "autonomous-loop"
        ? "今回は自律ループ中です。直前の結果を踏まえて次の一手を明確に更新してください。"
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

  return [common, readableFormat, op].join("\n\n") + meetingContextBlock + meetingLogBlock;
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

  const stream = createUIMessageStream<DemoUIMessage>({
    execute: async ({ writer }) => {
      const startedAtIso = new Date().toISOString();
      writer.write({
        type: "data-tool",
        id: `tool-model-${Date.now()}`,
        data: {
          id: `tool-model-${Date.now()}`,
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
          operation: parsed.data.operation,
          meetingContext: parsed.data.meetingContext,
          meetingLog,
        }),
        messages: await convertToModelMessages(messages),
      });

      writer.merge(result.toUIMessageStream());

      const assistantMarkdown = (await result.text).trim();
      const modelFinishedIso = new Date().toISOString();
      writer.write({
        type: "data-tool",
        id: `tool-model-done-${Date.now()}`,
        data: {
          id: `tool-model-done-${Date.now()}`,
          name: "model-call",
          status: "success",
          detail: "推論が完了しました。構造化サマリを生成します。",
          timestamp: modelFinishedIso,
        },
        transient: true,
      });

      if (!assistantMarkdown) {
        writer.write({
          type: "data-tool",
          id: `tool-structured-empty-${Date.now()}`,
          data: {
            id: `tool-structured-empty-${Date.now()}`,
            name: "structured-output",
            status: "error",
            detail: "モデル出力が空のため構造化をスキップしました。",
            timestamp: new Date().toISOString(),
          },
          transient: true,
        });
        return;
      }

      writer.write({
        type: "data-tool",
        id: `tool-structured-${Date.now()}`,
        data: {
          id: `tool-structured-${Date.now()}`,
          name: "structured-output",
          status: "running",
          detail: "要点/リスク/次アクション/作業ログを抽出しています。",
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
            operation: parsed.data.operation,
            latestUserText: latestText,
            assistantMarkdown,
            meetingContext: parsed.data.meetingContext,
            meetingLog,
          }),
          temperature: 0,
        });

        const structuredData = structured.object;
        const nowIso = new Date().toISOString();

        writer.write({
          type: "data-structured",
          id: `structured-${Date.now()}`,
          data: structuredData,
          transient: true,
        });

        writer.write({
          type: "data-plan",
          id: `plan-${Date.now()}`,
          data: {
            steps: toPlanSteps(structuredData.worklog),
          },
          transient: true,
        });

        writer.write({
          type: "data-task",
          id: `task-${Date.now()}`,
          data: {
            items: toTaskItems(structuredData.actions),
          },
          transient: true,
        });

        writer.write({
          type: "data-artifact",
          id: `artifact-structured-${Date.now()}`,
          data: {
            id: `llm-structured-summary-${parsed.data.demo}`,
            name: "llm-structured-summary.md",
            kind: "markdown",
            content: buildStructuredArtifactMarkdown(structuredData),
            updatedAt: nowIso,
          },
          transient: true,
        });

        writer.write({
          type: "data-tool",
          id: `tool-structured-done-${Date.now()}`,
          data: {
            id: `tool-structured-done-${Date.now()}`,
            name: "structured-output",
            status: "success",
            detail: "構造化サマリを更新しました。固定サマリ/CoT/Artifacts を確認してください。",
            timestamp: nowIso,
          },
          transient: true,
        });
      } catch (structuredError) {
        writer.write({
          type: "data-tool",
          id: `tool-structured-error-${Date.now()}`,
          data: {
            id: `tool-structured-error-${Date.now()}`,
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
