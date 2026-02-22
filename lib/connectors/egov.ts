import { env } from "@/lib/env";
import { mockDatasetCandidates } from "@/lib/mock/gov";
import type { DatasetCandidate } from "@/types/demo";

const EGOV_ENDPOINT = "https://data.e-gov.go.jp/api/3/action/package_search";

function normalizeCandidate(item: Record<string, unknown>): DatasetCandidate {
  const title = (item.title as string | undefined) ?? "Untitled";
  const org =
    ((item.organization as Record<string, unknown> | undefined)?.title as string | undefined) ??
    "Unknown Org";
  const landingUrl =
    (item.url as string | undefined) ??
    `https://data.e-gov.go.jp/data/dataset/${encodeURIComponent((item.name as string | undefined) ?? title)}`;

  return {
    title,
    org,
    landingUrl,
    apiHint: "e-Gov metadata API",
  };
}

export async function getEgovDatasetCandidates() {
  if (env.DEMO_MODE !== "live") {
    return {
      mode: "mock" as const,
      candidates: mockDatasetCandidates,
      note: "DEMO_MODE=mock のためモックデータを返しています。",
    };
  }

  try {
    const response = await fetch(`${EGOV_ENDPOINT}?q=${encodeURIComponent("人口")}&rows=10`, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`e-Gov API error: ${response.status}`);
    }

    const payload = (await response.json()) as {
      result?: { results?: Array<Record<string, unknown>> };
    };

    const candidates = (payload.result?.results ?? []).map(normalizeCandidate);

    return {
      mode: "live" as const,
      candidates: candidates.length > 0 ? candidates : mockDatasetCandidates,
      note: candidates.length > 0 ? "e-Gov live データを取得しました。" : "候補が空のためモックを補完表示しています。",
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      candidates: mockDatasetCandidates,
      note: `e-Gov live 取得に失敗したためモックへフォールバックしました: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}
