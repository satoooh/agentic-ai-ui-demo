import type { RecruitingJobPosting } from "@/types/demo";

const ARBEITNOW_ENDPOINT = "https://www.arbeitnow.com/api/job-board-api";

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function matchQuery(posting: RecruitingJobPosting, query: string): boolean {
  const haystack = `${posting.title} ${posting.tags.join(" ")} ${posting.company}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function toPosting(item: Record<string, unknown>): RecruitingJobPosting {
  return {
    id: normalizeText(item.slug, crypto.randomUUID()),
    title: normalizeText(item.title, "Unknown Role"),
    company: normalizeText(item.company_name, "Unknown Company"),
    location: normalizeText(item.location, "Unknown"),
    remote: Boolean(item.remote),
    tags: Array.isArray(item.tags)
      ? item.tags
          .map((tag) => (typeof tag === "string" ? tag : ""))
          .filter((tag) => tag.length > 0)
      : [],
    url: normalizeText(item.url, "https://www.arbeitnow.com/"),
    publishedAt: normalizeText(item.created_at, new Date().toISOString()),
  };
}

export async function getRecruitingMarketJobs(options?: {
  query?: string;
}) {
  const query = options?.query?.trim() || "engineer";
  const response = await fetch(ARBEITNOW_ENDPOINT, {
    headers: { accept: "application/json" },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`Arbeitnow API error: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: Array<Record<string, unknown>>;
  };

  const normalized = (payload.data ?? []).slice(0, 120).map(toPosting);
  const filtered = normalized.filter((posting) => matchQuery(posting, query)).slice(0, 8);
  const jobs = filtered.length > 0 ? filtered : normalized.slice(0, 8);

  return {
    mode: "live" as const,
    jobs,
    note:
      jobs.length > 0
        ? `Arbeitnow live データを取得しました（query: ${query}）。`
        : `Arbeitnowから取得できる求人がありませんでした（query: ${query}）。`,
  };
}
