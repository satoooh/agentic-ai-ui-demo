import { NextResponse } from "next/server";
import { getEstatSeries } from "@/lib/connectors/estat";

function parseMode(value: string | null): "mock" | "live" | undefined {
  if (value === "mock" || value === "live") {
    return value;
  }

  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modeOverride = parseMode(searchParams.get("mode"));
  const data = await getEstatSeries({ modeOverride });
  return NextResponse.json(data);
}
