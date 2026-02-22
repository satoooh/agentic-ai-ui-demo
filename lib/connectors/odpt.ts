import { env } from "@/lib/env";
import { mockOperationEvents } from "@/lib/mock/transport";
import type { OperationEvent } from "@/types/demo";

const ODPT_ENDPOINT = "https://api.odpt.org/api/v4/odpt:TrainInformation";

function tail(uri: string | undefined): string {
  if (!uri) {
    return "unknown";
  }

  const segments = uri.split(":");
  return segments[segments.length - 1] ?? uri;
}

function toOperationEvent(item: Record<string, unknown>): OperationEvent {
  const line = tail(item["odpt:railway"] as string | undefined);
  const status =
    (item["odpt:trainInformationStatus"] as string | undefined) ??
    (item["odpt:trainInformationText"] as string | undefined) ??
    "不明";
  const details = (item["odpt:trainInformationText"] as string | undefined) ?? "詳細情報なし";
  const updatedAt = (item["dc:date"] as string | undefined) ?? new Date().toISOString();
  const sourceUrl =
    (item["@id"] as string | undefined) ?? `https://www.odpt.org/traininformation/${encodeURIComponent(line)}`;

  return {
    line,
    status,
    details,
    updatedAt,
    sourceUrl,
  };
}

export async function getOdptOperationEvents(options?: { modeOverride?: "mock" | "live" }) {
  const mode = options?.modeOverride ?? env.DEMO_MODE;

  if (mode !== "live" || !env.ODPT_TOKEN) {
    return {
      mode: "mock" as const,
      events: mockOperationEvents,
      note: "ODPT_TOKEN 未設定または mock モード指定のためモックデータを返しています。",
    };
  }

  try {
    const response = await fetch(
      `${ODPT_ENDPOINT}?acl:consumerKey=${encodeURIComponent(env.ODPT_TOKEN)}`,
      {
        headers: {
          accept: "application/json",
        },
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      throw new Error(`ODPT API error: ${response.status}`);
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    const events = payload.slice(0, 20).map(toOperationEvent);

    return {
      mode: "live" as const,
      events,
      note: "ODPT live データを取得しました。",
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      events: mockOperationEvents,
      note: `ODPT live 取得に失敗したためモックへフォールバックしました: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}
