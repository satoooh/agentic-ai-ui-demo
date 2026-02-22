import { env } from "@/lib/env";
import { mockResearchSignals } from "@/lib/mock/research";
import type { CorporateResearchSnapshot, ResearchSignal } from "@/types/demo";

const SEC_TICKER_ENDPOINT = "https://www.sec.gov/files/company_tickers_exchange.json";
const SEC_SUBMISSIONS_ENDPOINT = "https://data.sec.gov/submissions";
const GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const WIKIDATA_SEARCH_ENDPOINT = "https://www.wikidata.org/w/api.php";

interface SourceStatus {
  source: "sec" | "gdelt" | "wikidata";
  mode: "live" | "mock";
  count: number;
  note: string;
}

interface ConnectorResult {
  mode: "mock" | "live";
  query: string;
  snapshot: CorporateResearchSnapshot;
  sourceStatuses: SourceStatus[];
  signals: ResearchSignal[];
  note: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJsonWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs = 10000,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      next: { revalidate: 600 },
    });

    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseGdeltDate(raw: string | undefined): string {
  if (!raw || !/^\d{14}$/.test(raw)) {
    return new Date().toISOString();
  }

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6)) - 1;
  const day = Number(raw.slice(6, 8));
  const hour = Number(raw.slice(8, 10));
  const minute = Number(raw.slice(10, 12));
  const second = Number(raw.slice(12, 14));

  return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
}

function getMockSnapshot(query: string): ConnectorResult {
  const filings = mockResearchSignals.filter((signal) => signal.kind === "ir_filing");
  const news = mockResearchSignals.filter((signal) => signal.kind === "public_news");
  const profiles = mockResearchSignals.filter((signal) => signal.kind === "regulatory_note");

  return {
    mode: "mock",
    query,
    snapshot: {
      query,
      requestedAt: new Date().toISOString(),
      filings,
      news,
      profiles,
      notes: ["mock モード指定のため、企業IR/公開情報はサンプルデータです。"],
    },
    sourceStatuses: [
      {
        source: "sec",
        mode: "mock",
        count: filings.length,
        note: "mock dataset",
      },
      {
        source: "gdelt",
        mode: "mock",
        count: news.length,
        note: "mock dataset",
      },
      {
        source: "wikidata",
        mode: "mock",
        count: profiles.length,
        note: "mock dataset",
      },
    ],
    signals: mockResearchSignals,
    note: "mock モード指定のためモックデータを返しています。",
  };
}

async function fetchSecSignals(query: string) {
  const headers = {
    accept: "application/json",
    "user-agent": env.SEC_USER_AGENT,
  };

  try {
    const tickersPayload = await fetchJsonWithTimeout(SEC_TICKER_ENDPOINT, { headers });
    if (!isRecord(tickersPayload) || !Array.isArray(tickersPayload.data)) {
      return {
        mode: "mock" as const,
        note: "SECティッカー一覧の取得結果が不正でした。",
        signals: [] as ResearchSignal[],
      };
    }

    const normalizedQuery = normalize(query);
    const candidates = tickersPayload.data
      .filter(Array.isArray)
      .map((item) => ({
        cik: Number(item[0] ?? 0),
        name: String(item[1] ?? ""),
        ticker: String(item[2] ?? ""),
      }))
      .filter((item) => item.cik > 0);

    const selected =
      candidates.find((item) => normalize(item.ticker) === normalizedQuery) ??
      candidates.find((item) => normalize(item.name).includes(normalizedQuery)) ??
      candidates.find((item) => normalize(item.ticker).includes(normalizedQuery));

    if (!selected) {
      return {
        mode: "mock" as const,
        note: "SECで一致する企業が見つかりませんでした。",
        signals: [] as ResearchSignal[],
      };
    }

    const cik = String(selected.cik).padStart(10, "0");
    const submissionsPayload = await fetchJsonWithTimeout(`${SEC_SUBMISSIONS_ENDPOINT}/CIK${cik}.json`, {
      headers,
    });

    if (
      !isRecord(submissionsPayload) ||
      !isRecord(submissionsPayload.filings) ||
      !isRecord(submissionsPayload.filings.recent)
    ) {
      return {
        mode: "mock" as const,
        note: "SEC提出書類データの形式が不正でした。",
        signals: [] as ResearchSignal[],
      };
    }

    const recent = submissionsPayload.filings.recent as Record<string, unknown>;
    const forms = Array.isArray(recent.form) ? recent.form : [];
    const filingDates = Array.isArray(recent.filingDate) ? recent.filingDate : [];
    const accessionNumbers = Array.isArray(recent.accessionNumber) ? recent.accessionNumber : [];
    const primaryDocuments = Array.isArray(recent.primaryDocument) ? recent.primaryDocument : [];

    const selectedForms = new Set(["10-K", "10-Q", "8-K", "20-F", "6-K"]);
    const signals: ResearchSignal[] = [];

    for (let index = 0; index < forms.length; index += 1) {
      const form = String(forms[index] ?? "");
      if (!selectedForms.has(form)) {
        continue;
      }

      const accessionNumber = String(accessionNumbers[index] ?? "");
      const primaryDocument = String(primaryDocuments[index] ?? "");
      if (!accessionNumber || !primaryDocument) {
        continue;
      }

      const accessionWithoutDash = accessionNumber.replaceAll("-", "");
      const filingDate = String(filingDates[index] ?? "");

      signals.push({
        id: `sec-${accessionNumber}`,
        source: "sec",
        kind: "ir_filing",
        title: `${selected.ticker} ${form}`,
        summary: `${selected.name} の ${form} 提出（CIK: ${cik}）`,
        url: `https://www.sec.gov/Archives/edgar/data/${selected.cik}/${accessionWithoutDash}/${primaryDocument}`,
        score: Math.max(45, 92 - signals.length * 3),
        publishedAt: filingDate ? `${filingDate}T00:00:00Z` : new Date().toISOString(),
      });

      if (signals.length >= 6) {
        break;
      }
    }

    if (signals.length === 0) {
      return {
        mode: "mock" as const,
        note: "SEC提出書類は取得できましたが対象フォームが見つかりませんでした。",
        signals: [] as ResearchSignal[],
      };
    }

    return {
      mode: "live" as const,
      note: `SECで ${selected.ticker} のIR書類を ${signals.length} 件取得しました。`,
      signals,
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      note: `SEC取得エラー: ${error instanceof Error ? error.message : "unknown error"}`,
      signals: [] as ResearchSignal[],
    };
  }
}

async function fetchGdeltSignals(query: string) {
  try {
    const payload = await fetchJsonWithTimeout(
      `${GDELT_DOC_ENDPOINT}?query=${encodeURIComponent(
        query,
      )}&mode=ArtList&maxrecords=6&format=json&sort=datedesc`,
      {
        headers: {
          accept: "application/json",
          "user-agent": env.SEC_USER_AGENT,
        },
      },
      15000,
    );

    if (!isRecord(payload) || !Array.isArray(payload.articles)) {
      return {
        mode: "mock" as const,
        note: "GDELTの返却形式が不正でした。",
        signals: [] as ResearchSignal[],
      };
    }

    const signals: ResearchSignal[] = payload.articles
      .filter(isRecord)
      .map(
        (article, index) =>
          ({
            id: `gdelt-${index}-${String(article.url ?? "")}`,
            source: "gdelt",
            kind: "public_news",
            title: String(article.title ?? "Untitled"),
            summary:
              String(article.domain ?? "unknown source") +
              " / " +
              String(article.sourcecountry ?? "unknown country"),
            url: String(article.url ?? "https://api.gdeltproject.org/api/v2/doc/doc"),
            score: Math.max(40, 80 - index * 4),
            publishedAt: parseGdeltDate(String(article.seendate ?? "")),
          }) satisfies ResearchSignal,
      )
      .slice(0, 6);

    if (signals.length === 0) {
      return {
        mode: "mock" as const,
        note: "GDELTで一致するニュースが見つかりませんでした。",
        signals: [] as ResearchSignal[],
      };
    }

    return {
      mode: "live" as const,
      note: `GDELTで企業関連ニュースを ${signals.length} 件取得しました。`,
      signals,
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      note: `GDELT取得エラー: ${error instanceof Error ? error.message : "unknown error"}`,
      signals: [] as ResearchSignal[],
    };
  }
}

async function fetchWikidataSignals(query: string) {
  try {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      format: "json",
      language: "ja",
      uselang: "ja",
      type: "item",
      limit: "5",
      search: query,
      origin: "*",
    });

    const payload = await fetchJsonWithTimeout(`${WIKIDATA_SEARCH_ENDPOINT}?${params.toString()}`, {
      headers: {
        accept: "application/json",
        "user-agent": env.SEC_USER_AGENT,
      },
    });

    if (!isRecord(payload) || !Array.isArray(payload.search)) {
      return {
        mode: "mock" as const,
        note: "Wikidataの返却形式が不正でした。",
        signals: [] as ResearchSignal[],
      };
    }

    const signals: ResearchSignal[] = payload.search
      .filter(isRecord)
      .map((item, index) => {
        const entityId = String(item.id ?? `unknown-${index}`);
        const label = String(item.label ?? "Unknown");
        const description = String(item.description ?? "説明なし");
        const url = String(item.concepturi ?? `https://www.wikidata.org/wiki/${entityId}`);

        return {
          id: `wikidata-${entityId}`,
          source: "wikidata",
          kind: "regulatory_note",
          title: `${label} (${entityId})`,
          summary: description,
          url,
          score: Math.max(50, 76 - index * 3),
          publishedAt: new Date().toISOString(),
        } satisfies ResearchSignal;
      })
      .slice(0, 5);

    if (signals.length === 0) {
      return {
        mode: "mock" as const,
        note: "Wikidataで一致する企業情報が見つかりませんでした。",
        signals: [] as ResearchSignal[],
      };
    }

    return {
      mode: "live" as const,
      note: `Wikidataで企業プロフィール候補を ${signals.length} 件取得しました。`,
      signals,
    };
  } catch (error) {
    return {
      mode: "mock" as const,
      note: `Wikidata取得エラー: ${error instanceof Error ? error.message : "unknown error"}`,
      signals: [] as ResearchSignal[],
    };
  }
}

export async function getResearchSignals(options?: {
  modeOverride?: "mock" | "live";
  query?: string;
}): Promise<ConnectorResult> {
  const mode = options?.modeOverride ?? env.DEMO_MODE;
  const query = options?.query?.trim() || "Microsoft";

  if (mode !== "live") {
    return getMockSnapshot(query);
  }

  const [sec, gdelt, wikidata] = await Promise.all([
    fetchSecSignals(query),
    fetchGdeltSignals(query),
    fetchWikidataSignals(query),
  ]);

  const filings = [...sec.signals].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const news = [...gdelt.signals].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const profiles = [...wikidata.signals].sort((a, b) => b.score - a.score);

  const sourceStatuses: SourceStatus[] = [
    { source: "sec", mode: sec.mode, count: sec.signals.length, note: sec.note },
    { source: "gdelt", mode: gdelt.mode, count: gdelt.signals.length, note: gdelt.note },
    { source: "wikidata", mode: wikidata.mode, count: wikidata.signals.length, note: wikidata.note },
  ];

  const hasLiveSignals = filings.length > 0 || news.length > 0 || profiles.length > 0;
  if (!hasLiveSignals) {
    const fallback = getMockSnapshot(query);
    return {
      ...fallback,
      sourceStatuses,
      note: `live取得が空のためモックへフォールバックしました。${sourceStatuses
        .map((status) => `[${status.source}] ${status.note}`)
        .join(" / ")}`,
    };
  }

  const notes = sourceStatuses.map((status) => `[${status.source}] ${status.note}`);

  return {
    mode: "live",
    query,
    snapshot: {
      query,
      requestedAt: new Date().toISOString(),
      filings,
      news,
      profiles,
      notes,
    },
    sourceStatuses,
    signals: [...filings, ...news, ...profiles].sort((a, b) => b.score - a.score),
    note: notes.join(" / "),
  };
}
