import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { resolveLanguageModel } from "@/lib/models";
import { buildMockReply } from "@/lib/mock/chat";
import type { DemoId, DemoUIMessage, ModelProvider } from "@/types/chat";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  messages: z.array(z.unknown()).optional(),
  demo: z.enum(["sales", "recruiting", "meeting", "research"]).default("sales"),
  provider: z.enum(["openai", "gemini"]).default("openai"),
  model: z.string().optional(),
  modeOverride: z.enum(["mock", "live"]).optional(),
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

function buildMockInputText(input: {
  demo: DemoId;
  latestText: string;
  meetingContext?: string;
  meetingProfileId?: string;
  meetingLog?: string;
}): string {
  if (input.demo !== "meeting") {
    return input.latestText;
  }

  const sections = [
    input.meetingContext ?? "",
    input.meetingProfileId ? `会議タイプID: ${input.meetingProfileId}` : "",
    input.latestText ? `ユーザー依頼:\n${input.latestText}` : "",
    input.meetingLog ? `会議ログ:\n${input.meetingLog}` : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}

function writeMockReply({
  writer,
  demo,
  text,
  approved,
  meetingProfileId,
}: {
  writer: Parameters<Parameters<typeof createUIMessageStream<DemoUIMessage>>[0]["execute"]>[0]["writer"];
  demo: DemoId;
  text: string;
  approved?: boolean;
  meetingProfileId?: string;
}) {
  const reply = buildMockReply({ demo, text, approved, meetingProfileId });

  writer.write({
    type: "data-status",
    id: `status-${Date.now()}`,
    data: {
      phase: "mock",
      message: "mock モードでレスポンスを生成しました。",
    },
    transient: true,
  });

  reply.tools.forEach((tool) => {
    writer.write({
      type: "data-tool",
      id: tool.id,
      data: tool,
    });
  });

  if (reply.approval.required) {
    writer.write({
      type: "data-approval",
      id: `approval-${Date.now()}`,
      data: reply.approval,
    });
  }

  reply.queue.forEach((queueItem) => {
    writer.write({
      type: "data-queue",
      id: queueItem.id,
      data: queueItem,
    });
  });

  writer.write({
    type: "data-plan",
    id: `plan-${Date.now()}`,
    data: { steps: reply.plan },
  });

  writer.write({
    type: "data-task",
    id: `task-${Date.now()}`,
    data: { items: reply.tasks },
  });

  reply.artifacts.forEach((artifact) => {
    writer.write({
      type: "data-artifact",
      id: artifact.id,
      data: artifact,
    });
  });

  reply.citations.forEach((citation) => {
    writer.write({
      type: "source-url",
      sourceId: citation.id,
      url: citation.url,
      title: citation.title,
    });

    writer.write({
      type: "data-citation",
      id: citation.id,
      data: citation,
    });
  });

  const textId = `text-${Date.now()}`;
  writer.write({ type: "text-start", id: textId });
  writer.write({ type: "text-delta", id: textId, delta: reply.message });
  writer.write({ type: "text-end", id: textId });
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
  const mockInputText = buildMockInputText({
    demo: parsed.data.demo,
    latestText,
    meetingContext: parsed.data.meetingContext,
    meetingProfileId: parsed.data.meetingProfileId,
    meetingLog: parsed.data.meetingLog,
  });

  const stream = createUIMessageStream<DemoUIMessage>({
    execute: async ({ writer }) => {
      const mode = parsed.data.modeOverride ?? env.DEMO_MODE;
      const inLiveMode = mode === "live";

      if (!inLiveMode) {
        writeMockReply({
          writer,
          demo: parsed.data.demo,
          text: mockInputText,
          approved: parsed.data.approved,
          meetingProfileId: parsed.data.meetingProfileId,
        });
        return;
      }

      const modelResult = resolveLanguageModel({
        provider: parsed.data.provider as ModelProvider,
        model: parsed.data.model,
      });

      if (!modelResult.ok) {
        writer.write({
          type: "data-status",
          id: `status-${Date.now()}`,
          data: {
            phase: "fallback",
            message: `${modelResult.reason} mock レスポンスにフォールバックします。`,
          },
          transient: true,
        });

        writeMockReply({
          writer,
          demo: parsed.data.demo,
          text: mockInputText,
          approved: parsed.data.approved,
          meetingProfileId: parsed.data.meetingProfileId,
        });
        return;
      }

      writer.write({
        type: "data-tool",
        id: `tool-model-${Date.now()}`,
        data: {
          id: `tool-model-${Date.now()}`,
          name: "model-call",
          status: "running",
          detail: `${parsed.data.provider}/${modelResult.resolvedModel} で推論を開始しました。`,
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
