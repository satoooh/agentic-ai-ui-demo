import { NextResponse } from "next/server";
import { getMeetingSignals } from "@/lib/connectors/meeting-signal";

function parseMode(value: string | null): "mock" | "live" | undefined {
  if (value === "mock" || value === "live") {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeOverride = parseMode(searchParams.get("mode"));
  const query = searchParams.get("query") ?? undefined;
  const data = await getMeetingSignals({ modeOverride, query });
  return NextResponse.json(data);
}
