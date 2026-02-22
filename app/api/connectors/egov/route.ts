import { NextResponse } from "next/server";
import { getEgovDatasetCandidates } from "@/lib/connectors/egov";

export async function GET() {
  const data = await getEgovDatasetCandidates();
  return NextResponse.json(data);
}
