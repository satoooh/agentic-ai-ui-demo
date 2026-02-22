import { z } from "zod";

const modeSchema = z.enum(["mock", "live"]);

const parsedMode = modeSchema.safeParse(process.env.DEMO_MODE);

export const env = {
  DEMO_MODE: parsedMode.success ? parsedMode.data : "mock",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-5.1",
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  ODPT_TOKEN: process.env.ODPT_TOKEN,
  ESTAT_APP_ID: process.env.ESTAT_APP_ID,
} as const;

export const isLiveMode = env.DEMO_MODE === "live";
