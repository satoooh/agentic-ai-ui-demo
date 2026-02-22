import { env } from "@/lib/env";
import type { MeetingSignal } from "@/types/demo";

const HN_SEARCH_ENDPOINT = "https://hn.algolia.com/api/v1/search";

interface ConnectorResult {
  mode: "live";
  query: string;
  signals: MeetingSignal[];
  note: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 10000): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
      headers: {
        accept: "application/json",
        "user-agent": env.SEC_USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchLiveSignals(query: string): Promise<ConnectorResult> {
  const params = new URLSearchParams({
    query,
    tags: "story",
    hitsPerPage: "6",
  });
  const payload = await fetchJsonWithTimeout(`${HN_SEARCH_ENDPOINT}?${params.toString()}`);

  if (!isRecord(payload) || !Array.isArray(payload.hits)) {
    throw new Error("HN APIの返却形式が不正です。");
  }

  const signals: MeetingSignal[] = payload.hits
    .filter(isRecord)
    .map((hit, index) => {
      const title = String(hit.title ?? hit.story_title ?? "Untitled");
      const url = String(hit.url ?? hit.story_url ?? "https://news.ycombinator.com/");
      const author = String(hit.author ?? "unknown");
      const points = Number(hit.points ?? 0);
      const comments = Number(hit.num_comments ?? 0);
      const publishedRaw = String(hit.created_at ?? "");

      return {
        id: `meeting-live-${index}-${String(hit.objectID ?? index)}`,
        source: "hn",
        title,
        summary: `author: ${author} / points: ${points} / comments: ${comments}`,
        url,
        points,
        comments,
        publishedAt: publishedRaw ? new Date(publishedRaw).toISOString() : new Date().toISOString(),
      } satisfies MeetingSignal;
    })
    .filter((signal) => signal.title !== "Untitled")
    .slice(0, 6);

  return {
    mode: "live",
    query,
    signals,
    note:
      signals.length > 0
        ? `HNから ${signals.length} 件の公開シグナルを取得しました（API key不要）。`
        : "HNで一致する公開シグナルが見つかりませんでした。",
  };
}

export async function getMeetingSignals({
  query = "hiring strategy b2b sales",
}: {
  query?: string;
}): Promise<ConnectorResult> {
  return fetchLiveSignals(query);
}
