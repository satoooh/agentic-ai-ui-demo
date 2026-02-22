import { env } from "@/lib/env";
import { mockStatSeries } from "@/lib/mock/gov";
import type { StatSeries } from "@/types/demo";

const ESTAT_ENDPOINT = "https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData";

function toStatSeries(payload: Record<string, unknown>, statsDataId: string): StatSeries {
  const values =
    (((payload.GET_STATS_DATA as Record<string, unknown> | undefined)?.STATISTICAL_DATA as
      | Record<string, unknown>
      | undefined)?.DATA_INF as Record<string, unknown> | undefined)?.VALUE;

  const list = Array.isArray(values)
    ? values
    : values
      ? [values]
      : [];

  const mapped = list
    .slice(0, 12)
    .map((item) => {
      const record = item as Record<string, string>;
      const area = record["@area"] ?? "unknown-area";
      const time = record["@time"] ?? "unknown-time";
      const rawValue = Number(record["$"] ?? 0);
      return {
        label: `${area} ${time}`,
        value: Number.isFinite(rawValue) ? rawValue : 0,
      };
    })
    .filter((item) => item.value > 0);

  return {
    statsDataId,
    dimensions: ["area", "time"],
    data: mapped.length > 0 ? mapped : mockStatSeries.data,
  };
}

export async function getEstatSeries() {
  if (env.DEMO_MODE !== "live" || !env.ESTAT_APP_ID) {
    return {
      mode: "mock" as const,
      series: mockStatSeries,
      note: "ESTAT_APP_ID 未設定または DEMO_MODE=mock のためモックデータを返しています。",
    };
  }

  const statsDataId = "0003412312";

  try {
    const url =
      `${ESTAT_ENDPOINT}?appId=${encodeURIComponent(env.ESTAT_APP_ID)}&statsDataId=${statsDataId}` +
      "&metaGetFlg=Y&cntGetFlg=N";

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`e-Stat API error: ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;

    return {
      mode: "live" as const,
      series: toStatSeries(payload, statsDataId),
      note: "e-Stat live データを取得しました。",
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      series: mockStatSeries,
      note: `e-Stat live 取得に失敗したためモックへフォールバックしました: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}
