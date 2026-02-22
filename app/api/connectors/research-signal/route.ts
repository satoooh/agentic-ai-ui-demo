import { NextResponse } from "next/server";
import { getResearchSignals } from "@/lib/connectors/research-signal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? undefined;

  try {
    const data = await getResearchSignals({ query });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch research signal",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }
}
