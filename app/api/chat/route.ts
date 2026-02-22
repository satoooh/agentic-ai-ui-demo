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
  demo: z.enum(["sales", "recruiting", "research"]).default("sales"),
  provider: z.enum(["openai", "gemini"]).default("openai"),
  model: z.string().optional(),
  approved: z.boolean().optional(),
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

function writeMockReply({
  writer,
  demo,
  text,
  approved,
}: {
  writer: Parameters<Parameters<typeof createUIMessageStream<DemoUIMessage>>[0]["execute"]>[0]["writer"];
  demo: DemoId;
  text: string;
  approved?: boolean;
}) {
  const reply = buildMockReply({ demo, text, approved });

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

  const stream = createUIMessageStream<DemoUIMessage>({
    execute: async ({ writer }) => {
      const inLiveMode = env.DEMO_MODE === "live";

      if (!inLiveMode) {
        writeMockReply({
          writer,
          demo: parsed.data.demo,
          text: latestText,
          approved: parsed.data.approved,
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
          text: latestText,
          approved: parsed.data.approved,
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
        system:
          "You are an enterprise workflow copilot. Reply in concise Japanese with operational clarity, highlight risks, and provide next actions.",
        messages: await convertToModelMessages(messages),
        onFinish() {
          writer.write({
            type: "data-tool",
            id: `tool-model-done-${Date.now()}`,
            data: {
              id: `tool-model-done-${Date.now()}`,
              name: "model-call",
              status: "success",
              detail: "推論が完了しました。必要に応じて承認または成果物保存を実行してください。",
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
