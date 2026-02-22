import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().min(1),
  voice: z.string().default("default-ja"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return NextResponse.json({
    audioUrl: null,
    voice: parsed.data.voice,
    text: parsed.data.text,
    note: "サーバーTTSは未接続です。クライアント側の SpeechSynthesis プレビューを利用してください。",
  });
}
