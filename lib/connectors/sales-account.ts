import { env } from "@/lib/env";
import type { SalesAccountInsight } from "@/types/demo";

const GITHUB_API_BASE = "https://api.github.com";

function normalizeLanguage(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function createHeaders(): HeadersInit {
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

export async function getSalesAccountInsight(options?: {
  org?: string;
}) {
  const org = options?.org?.trim() || "vercel";
  const [orgResponse, reposResponse] = await Promise.all([
    fetch(`${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}`, {
      headers: createHeaders(),
      next: { revalidate: 300 },
    }),
    fetch(
      `${GITHUB_API_BASE}/orgs/${encodeURIComponent(org)}/repos?per_page=5&sort=updated&direction=desc`,
      {
        headers: createHeaders(),
        next: { revalidate: 300 },
      },
    ),
  ]);

  if (!orgResponse.ok || !reposResponse.ok) {
    throw new Error(`GitHub API error: ${orgResponse.status}/${reposResponse.status}`);
  }

  const orgPayload = (await orgResponse.json()) as Record<string, unknown>;
  const reposPayload = (await reposResponse.json()) as Array<Record<string, unknown>>;

  const insight: SalesAccountInsight = {
    orgLogin: (orgPayload.login as string | undefined) ?? org,
    displayName: (orgPayload.name as string | undefined) ?? org,
    website:
      (orgPayload.blog as string | undefined) ||
      (orgPayload.html_url as string | undefined) ||
      `https://github.com/${org}`,
    followers: Number(orgPayload.followers ?? 0),
    publicRepos: Number(orgPayload.public_repos ?? 0),
    topRepositories: reposPayload.map((repo) => ({
      name: (repo.name as string | undefined) ?? "unknown",
      stars: Number(repo.stargazers_count ?? 0),
      language: normalizeLanguage(repo.language),
      updatedAt: (repo.updated_at as string | undefined) ?? new Date().toISOString(),
      url: (repo.html_url as string | undefined) ?? `https://github.com/${org}`,
    })),
  };

  return {
    mode: "live" as const,
    insight,
    note: `GitHub live データを取得しました（org: ${insight.orgLogin}）。`,
  };
}
