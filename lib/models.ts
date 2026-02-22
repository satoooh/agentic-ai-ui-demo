import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { env } from "@/lib/env";
import type { ModelProvider } from "@/types/chat";

export const MODEL_OPTIONS: Record<ModelProvider, string[]> = {
  openai: ["gpt-5.1", "gpt-5-mini", "gpt-4.1-mini"],
  gemini: ["gemini-2.5-flash", "gemini-3-pro-preview", "gemini-flash-latest"],
};

export function getDefaultModel(provider: ModelProvider): string {
  const configured = provider === "openai" ? env.OPENAI_MODEL : env.GEMINI_MODEL;
  if (MODEL_OPTIONS[provider].includes(configured)) {
    return configured;
  }

  return MODEL_OPTIONS[provider][0];
}

export function resolveLanguageModel({
  provider,
  model,
}: {
  provider: ModelProvider;
  model?: string;
}):
  | { ok: true; model: LanguageModel; resolvedModel: string }
  | { ok: false; reason: string } {
  const resolvedModel = model ?? getDefaultModel(provider);

  if (provider === "openai") {
    if (!env.OPENAI_API_KEY) {
      return {
        ok: false,
        reason: "OPENAI_API_KEY が未設定です。Settings で確認してください。",
      };
    }

    return { ok: true, model: openai(resolvedModel), resolvedModel };
  }

  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      ok: false,
      reason: "GOOGLE_GENERATIVE_AI_API_KEY が未設定です。Settings で確認してください。",
    };
  }

  return { ok: true, model: google(resolvedModel), resolvedModel };
}
