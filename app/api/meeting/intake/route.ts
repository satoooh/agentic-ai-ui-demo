import { generateObject } from "ai";
import { z } from "zod";
import { resolveLanguageModel } from "@/lib/models";
import type { ModelProvider } from "@/types/chat";

export const runtime = "nodejs";

const requestSchema = z.object({
  provider: z.enum(["openai", "gemini"]).default("openai"),
  model: z.string().optional(),
  transcript: z.string().min(20),
  meetingContext: z.string().optional(),
});

const responseSchema = z.object({
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(280),
  keyPoints: z.array(z.string().min(1).max(120)).min(1).max(3),
});

function compactText(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}

function truncateTranscriptForPrompt(transcript: string, maxLength = 12000): string {
  if (transcript.length <= maxLength) {
    return transcript;
  }

  const headLength = Math.floor(maxLength * 0.6);
  const tailLength = maxLength - headLength;
  return `${transcript.slice(0, headLength)}\n...[middle omitted ${transcript.length - maxLength} chars]...\n${transcript.slice(-tailLength)}`;
}

function deriveFallbackHeadline(transcript: string): string {
  const firstLine = transcript
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return "会議レビュー要約";
  }

  const normalized = firstLine
    .replace(/^\[\d{2}:\d{2}(:\d{2})?\]\s*/, "")
    .replace(/^[^:：]{1,24}[:：]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  return compactText(normalized || "会議レビュー要約", 38);
}

function deriveFallbackSummary(transcript: string): { summary: string; keyPoints: string[] } {
  const lines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 4);

  const summary =
    lines.length > 0
      ? compactText(lines.join(" / "), 180)
      : "議事録を受け取りました。会議の主要論点を確認してください。";

  const keyPoints = lines.slice(0, 3).map((line) => compactText(line, 88));
  if (keyPoints.length === 0) {
    keyPoints.push("議事録から主要論点を抽出します。");
  }

  return { summary, keyPoints };
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const transcript = parsed.data.transcript.trim();
  const requestedProvider = parsed.data.provider as ModelProvider;
  let resolvedProvider = requestedProvider;
  let modelResult = resolveLanguageModel({
    provider: requestedProvider,
    model: parsed.data.model,
  });
  let fallbackNote: string | null = null;

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
      fallbackNote = `${requestedProvider} が未設定のため ${fallbackProvider} に自動切替しました。`;
    }
  }

  if (!modelResult.ok) {
    return Response.json(
      {
        error: "Model configuration error",
        message:
          modelResult.reason ??
          "LLMの設定が不正です。OPENAI_API_KEY または GOOGLE_GENERATIVE_AI_API_KEY を確認してください。",
      },
      { status: 400 },
    );
  }

  try {
    const result = await generateObject({
      model: modelResult.model,
      schema: responseSchema,
      temperature: 0,
      prompt: [
        "あなたは会議レビューの事前要約アシスタントです。",
        "議事録を読んで、チャット開始前に表示する短い会議サマリーを作成してください。",
        "",
        "制約:",
        "- headline: 会議タイトル（18〜40文字程度）",
        "- summary: 1〜2文、120文字以内",
        "- keyPoints: 箇条書き3件以内（各80文字以内）",
        "- 推測や提案は書かず、議事録の事実に限定する",
        "",
        parsed.data.meetingContext
          ? `会議コンテキスト:\n${parsed.data.meetingContext}`
          : "",
        "議事録:",
        truncateTranscriptForPrompt(transcript),
      ]
        .filter((line) => line.length > 0)
        .join("\n"),
    });

    return Response.json({
      ...result.object,
      provider: resolvedProvider,
      model: modelResult.resolvedModel,
      fallback: false,
      note: fallbackNote,
    });
  } catch (error) {
    const fallback = deriveFallbackSummary(transcript);
    return Response.json({
      headline: deriveFallbackHeadline(transcript),
      summary: fallback.summary,
      keyPoints: fallback.keyPoints,
      provider: resolvedProvider,
      model: modelResult.resolvedModel,
      fallback: true,
      note:
        fallbackNote ??
        (error instanceof Error
          ? `事前サマリー生成に失敗したため簡易要約を使用しました: ${error.message}`
          : "事前サマリー生成に失敗したため簡易要約を使用しました。"),
    });
  }
}
