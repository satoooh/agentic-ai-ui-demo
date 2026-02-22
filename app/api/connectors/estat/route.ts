import { NextResponse } from "next/server";
import { getEstatSeries } from "@/lib/connectors/estat";

export async function GET() {
  const data = await getEstatSeries();
  return NextResponse.json(data);
}
