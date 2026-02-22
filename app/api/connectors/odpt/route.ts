import { NextResponse } from "next/server";
import { getOdptOperationEvents } from "@/lib/connectors/odpt";

export async function GET() {
  const data = await getOdptOperationEvents();
  return NextResponse.json(data);
}
