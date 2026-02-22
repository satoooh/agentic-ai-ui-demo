import { env } from "@/lib/env";
import { mockResearchSignals } from "@/lib/mock/research";
import type { ResearchSignal } from "@/types/demo";

const HN_SEARCH_ENDPOINT = "https://hn.algolia.com/api/v1/search";
const GITHUB_SEARCH_ENDPOINT = "https://api.github.com/search/repositories";

function createGitHubHeaders(): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    "user-agent": "agentic-ai-ui-demo",
    ...(env.GITHUB_TOKEN
      ? {
          authorization: `Bearer ${env.GITHUB_TOKEN}`,
        }
      : {}),
  };
}

function mapHnHit(hit: Record<string, unknown>): ResearchSignal {
  const title =
    (hit["title"] as string | undefined) ??
    (hit["story_title"] as string | undefined) ??
    "Untitled";
  const summary =
    (hit["story_text"] as string | undefined) ??
    (hit["comment_text"] as string | undefined) ??
    "HN discussion signal";

  return {
    id: `hn-${String(hit["objectID"] ?? crypto.randomUUID())}`,
    source: "hn",
    title,
    summary,
    url:
      (hit["url"] as string | undefined) ??
      (hit["story_url"] as string | undefined) ??
      `https://news.ycombinator.com/item?id=${String(hit["objectID"] ?? "")}`,
    score: Number(hit["points"] ?? 0),
    publishedAt: (hit["created_at"] as string | undefined) ?? new Date().toISOString(),
  };
}

function mapGitHubRepo(repo: Record<string, unknown>): ResearchSignal {
  const fullName = (repo.full_name as string | undefined) ?? "unknown/repo";
  const description = (repo.description as string | undefined) ?? "No description";

  return {
    id: `gh-${fullName}`,
    source: "github",
    title: fullName,
    summary: description,
    url: (repo.html_url as string | undefined) ?? `https://github.com/${fullName}`,
    score: Number(repo.stargazers_count ?? 0),
    publishedAt: (repo.pushed_at as string | undefined) ?? new Date().toISOString(),
  };
}

export async function getResearchSignals(options?: {
  modeOverride?: "mock" | "live";
  query?: string;
}) {
  const mode = options?.modeOverride ?? env.DEMO_MODE;
  const query = options?.query?.trim() || "ai agents";

  if (mode !== "live") {
    return {
      mode: "mock" as const,
      signals: mockResearchSignals,
      note: "mock モード指定のためモックデータを返しています。",
    };
  }

  try {
    const [hnResponse, githubResponse] = await Promise.all([
      fetch(
        `${HN_SEARCH_ENDPOINT}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=5`,
        {
          headers: { accept: "application/json" },
          next: { revalidate: 600 },
        },
      ),
      fetch(
        `${GITHUB_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`,
        {
          headers: createGitHubHeaders(),
          next: { revalidate: 600 },
        },
      ),
    ]);

    if (!hnResponse.ok || !githubResponse.ok) {
      throw new Error(`Research API error: ${hnResponse.status}/${githubResponse.status}`);
    }

    const hnPayload = (await hnResponse.json()) as {
      hits?: Array<Record<string, unknown>>;
    };
    const githubPayload = (await githubResponse.json()) as {
      items?: Array<Record<string, unknown>>;
    };

    const signals = [
      ...(hnPayload.hits ?? []).map(mapHnHit),
      ...(githubPayload.items ?? []).map(mapGitHubRepo),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      mode: "live" as const,
      signals: signals.length > 0 ? signals : mockResearchSignals,
      note:
        signals.length > 0
          ? `HN/GitHub live データを取得しました（query: ${query}）。`
          : "live データが空だったためモックを補完表示しています。",
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      signals: mockResearchSignals,
      note: `live 取得に失敗したためモックへフォールバックしました: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }
}
