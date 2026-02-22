import { NextResponse } from "next/server";
import { getSalesAccountInsight } from "@/lib/connectors/sales-account";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const org = searchParams.get("org") ?? undefined;

  try {
    const data = await getSalesAccountInsight({ org });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch account signal",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }
}
