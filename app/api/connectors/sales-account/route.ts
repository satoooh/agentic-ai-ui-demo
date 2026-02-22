import { NextResponse } from "next/server";
import { getSalesAccountInsight } from "@/lib/connectors/sales-account";

function parseMode(value: string | null): "mock" | "live" | undefined {
  if (value === "mock" || value === "live") {
    return value;
  }
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeOverride = parseMode(searchParams.get("mode"));
  const org = searchParams.get("org") ?? undefined;
  const data = await getSalesAccountInsight({ modeOverride, org });
  return NextResponse.json(data);
}
