import { env } from "@/lib/env";
import { mockResearchSignals } from "@/lib/mock/research";
import type { CorporateResearchSnapshot, ResearchSignal } from "@/types/demo";

const EDINET_DOCUMENTS_ENDPOINT = "https://api.edinet-fsa.go.jp/api/v2/documents.json";
const SEC_TICKER_ENDPOINT = "https://www.sec.gov/files/company_tickers_exchange.json";
const SEC_SUBMISSIONS_ENDPOINT = "https://data.sec.gov/submissions";
const GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

interface SourceStatus {
  source: "edinet" | "sec" | "gdelt";
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
  timeoutMs = 8000,
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

function toJstDate(value: Date): string {
  return value.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replaceAll("/", "-");
}

function listRecentJstDates(days: number): string[] {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - index);
    return toJstDate(date);
  });
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
  return {
    mode: "mock",
    query,
    snapshot: {
      query,
      requestedAt: new Date().toISOString(),
      filings,
      news,
      notes: ["mock モード指定のため、企業IR/公開情報はサンプルデータです。"],
    },
    sourceStatuses: [
      { source: "edinet", mode: "mock", count: filings.filter((signal) => signal.source === "edinet").length, note: "mock dataset" },
      { source: "sec", mode: "mock", count: filings.filter((signal) => signal.source === "sec").length, note: "mock dataset" },
      { source: "gdelt", mode: "mock", count: news.length, note: "mock dataset" },
    ],
    signals: mockResearchSignals,
    note: "mock モード指定のためモックデータを返しています。",
  };
}

async function fetchEdinetSignals(query: string) {
  if (!env.EDINET_API_KEY) {
    return {
      mode: "mock" as const,
      note: "EDINET_API_KEY が未設定のためEDINET取得をスキップしました。",
      signals: [] as ResearchSignal[],
    };
  }

  const normalizedQuery = normalize(query);
  const dates = listRecentJstDates(7);

  for (const date of dates) {
    try {
      const payload = await fetchJsonWithTimeout(
        `${EDINET_DOCUMENTS_ENDPOINT}?date=${encodeURIComponent(date)}&type=2`,
        {
          headers: {
            accept: "application/json",
            "Subscription-Key": env.EDINET_API_KEY,
          },
        },
      );

      if (!isRecord(payload)) {
        continue;
      }

      const results = Array.isArray(payload.results) ? payload.results : [];
      const matches = results
        .filter(isRecord)
        .filter((record) => {
          const filerName = String(record.filerName ?? "").toLowerCase();
          const secCode = String(record.secCode ?? "").toLowerCase();
          const edinetCode = String(record.edinetCode ?? "").toLowerCase();
          return (
            filerName.includes(normalizedQuery) ||
            secCode.includes(normalizedQuery) ||
            edinetCode.includes(normalizedQuery)
          );
        })
        .slice(0, 6);

      if (matches.length === 0) {
        continue;
      }

      const signals = matches.map((record, index) => {
        const docId = String(record.docID ?? `unknown-${date}-${index}`);
        const filerName = String(record.filerName ?? "提出会社");
        const docDescription =
          String(record.docDescription ?? "").trim() || String(record.formCode ?? "提出書類");
        const secCode = String(record.secCode ?? "-");

        return {
          id: `edinet-${docId}`,
          source: "edinet",
          kind: "ir_filing",
          title: `${filerName} ${docDescription}`,
          summary: `提出者: ${filerName} / 証券コード: ${secCode}`,
          url: `https://api.edinet-fsa.go.jp/api/v2/documents/${docId}?type=2`,
          score: Math.max(50, 95 - index * 4),
          publishedAt: String(record.submitDateTime ?? `${date}T00:00:00+09:00`),
        } satisfies ResearchSignal;
      });

      return {
        mode: "live" as const,
        note: `EDINETで ${signals.length} 件の提出書類を取得しました（date=${date}）。`,
        signals,
      };
    } catch (error) {
      return {
        mode: "mock" as const,
        note: `EDINET取得エラー: ${error instanceof Error ? error.message : "unknown error"}`,
        signals: [] as ResearchSignal[],
      };
    }
  }

  return {
    mode: "mock" as const,
    note: "EDINETで一致する提出書類が見つかりませんでした。",
    signals: [] as ResearchSignal[],
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

    if (!isRecord(submissionsPayload) || !isRecord(submissionsPayload.filings) || !isRecord(submissionsPayload.filings.recent)) {
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
      `${GDELT_DOC_ENDPOINT}?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=6&format=json&sort=datedesc`,
      { headers: { accept: "application/json" } },
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
      .map((article, index) => ({
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
      } satisfies ResearchSignal))
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

export async function getResearchSignals(options?: {
  modeOverride?: "mock" | "live";
  query?: string;
}): Promise<ConnectorResult> {
  const mode = options?.modeOverride ?? env.DEMO_MODE;
  const query = options?.query?.trim() || "Microsoft";

  if (mode !== "live") {
    return getMockSnapshot(query);
  }

  const [edinet, sec, gdelt] = await Promise.all([
    fetchEdinetSignals(query),
    fetchSecSignals(query),
    fetchGdeltSignals(query),
  ]);

  const filings = [...edinet.signals, ...sec.signals]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const news = [...gdelt.signals]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const sourceStatuses: SourceStatus[] = [
    { source: "edinet", mode: edinet.mode, count: edinet.signals.length, note: edinet.note },
    { source: "sec", mode: sec.mode, count: sec.signals.length, note: sec.note },
    { source: "gdelt", mode: gdelt.mode, count: gdelt.signals.length, note: gdelt.note },
  ];

  const hasLiveSignals = filings.length > 0 || news.length > 0;
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
      notes,
    },
    sourceStatuses,
    signals: [...filings, ...news].sort((a, b) => b.score - a.score),
    note: notes.join(" / "),
  };
}
