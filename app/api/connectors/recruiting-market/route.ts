import { NextResponse } from "next/server";
import { getRecruitingMarketJobs } from "@/lib/connectors/recruiting-market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? undefined;

  try {
    const data = await getRecruitingMarketJobs({ query });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch recruiting market signal",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }
}
