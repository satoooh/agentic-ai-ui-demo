import { NextResponse } from "next/server";
import { getMeetingSignals } from "@/lib/connectors/meeting-signal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? undefined;

  try {
    const data = await getMeetingSignals({ query });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch meeting signal",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }
}
