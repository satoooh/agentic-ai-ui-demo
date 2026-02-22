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
    mode: "mock",
    audioUrl: null,
    voice: parsed.data.voice,
    text: parsed.data.text,
    note: "TTS live 実装前のモックレスポンスです。AudioPlayer接続時は audioUrl を返す実装へ置換してください。",
  });
}
