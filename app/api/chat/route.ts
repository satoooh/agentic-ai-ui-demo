import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { z } from "zod";
import { resolveLanguageModel } from "@/lib/models";
import type { DemoId, DemoUIMessage, ModelProvider } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 30;

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

function buildSystemPrompt(input: {
  demo: DemoId;
  operation?: "default" | "devils-advocate" | "autonomous-loop" | "scenario";
  meetingContext?: string;
  meetingLog?: string;
}): string {
  const common =
    "あなたは業務オペレーション向けのAIアシスタントです。日本語で簡潔に、読みやすい構造で回答してください。";
  const readableFormat =
    "出力は必ず以下の順で:\n" +
    "1. 要点サマリー（3行以内）\n" +
    "2. 重要な論点（箇条書き）\n" +
    "3. 次アクション（担当/期限/検証指標を含む）";

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

  const stream = createUIMessageStream<DemoUIMessage>({
    execute: async ({ writer }) => {
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
          timestamp: new Date().toISOString(),
        },
        transient: true,
      });

      const result = streamText({
        model: modelResult.model,
        system: buildSystemPrompt({
          demo: parsed.data.demo,
          operation: parsed.data.operation,
          meetingContext: parsed.data.meetingContext,
          meetingLog: parsed.data.meetingLog,
        }),
        messages: await convertToModelMessages(messages),
        onFinish() {
          writer.write({
            type: "data-tool",
            id: `tool-model-done-${Date.now()}`,
            data: {
              id: `tool-model-done-${Date.now()}`,
              name: "model-call",
              status: "success",
              detail: "推論が完了しました。成果物の更新内容を確認し、次のループへ進めてください。",
              timestamp: new Date().toISOString(),
            },
            transient: true,
          });
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
