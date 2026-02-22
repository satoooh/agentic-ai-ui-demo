import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    hasOpenAIKey: Boolean(env.OPENAI_API_KEY),
    hasGeminiKey: Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY),
  });
}
