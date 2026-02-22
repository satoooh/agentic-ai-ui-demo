"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DatasetCandidate, StatSeries } from "@/types/demo";

interface EgovResponse {
  mode: "mock" | "live";
  candidates: DatasetCandidate[];
  note: string;
}

interface EstatResponse {
  mode: "mock" | "live";
  series: StatSeries | null;
  note: string;
}

export function GovSourcePanel() {
  const [egov, setEgov] = useState<EgovResponse | null>(null);
  const [estat, setEstat] = useState<EstatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<"auto" | "mock" | "live">("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const maxStatValue = useMemo(() => {
    if (!estat?.series?.data?.length) {
      return 1;
    }

    return Math.max(...estat.series.data.map((item) => item.value), 1);
  }, [estat]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const search = modeOverride === "auto" ? "" : `?mode=${modeOverride}`;
      const [egovResponse, estatResponse] = await Promise.all([
        fetch(`/api/connectors/egov${search}`, { cache: "no-store" }),
        fetch(`/api/connectors/estat${search}`, { cache: "no-store" }),
      ]);

      if (!egovResponse.ok || !estatResponse.ok) {
        throw new Error(`status ${egovResponse.status}/${estatResponse.status}`);
      }

      setEgov((await egovResponse.json()) as EgovResponse);
      setEstat((await estatResponse.json()) as EstatResponse);
      setLastFetchedAt(new Date().toLocaleTimeString("ja-JP"));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [modeOverride]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">e-Gov / e-Stat Connectors</h2>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
            egov?.mode === "live" || estat?.mode === "live"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {(egov?.mode ?? estat?.mode) ?? "loading"}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <select
          value={modeOverride}
          onChange={(event) => setModeOverride(event.target.value as "auto" | "mock" | "live")}
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="auto">mode: auto</option>
          <option value="mock">mode: mock</option>
          <option value="live">mode: live</option>
        </select>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="rounded border border-slate-300 px-2 py-1"
        >
          {isLoading ? "refreshing..." : "refresh"}
        </button>
        {lastFetchedAt ? <span>last: {lastFetchedAt}</span> : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-900">e-Gov</p>
          {egov ? (
            <>
              <p className="text-xs text-slate-700">mode: {egov.mode}</p>
              <p className="text-xs text-slate-600">{egov.note}</p>
              <ul className="mt-1 list-inside list-disc text-xs text-slate-700">
                {egov.candidates.slice(0, 2).map((candidate) => (
                  <li key={candidate.title}>
                    <a
                      href={candidate.landingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {candidate.title}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-slate-600">loading...</p>
          )}
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-900">e-Stat</p>
          {estat ? (
            <>
              <p className="text-xs text-slate-700">mode: {estat.mode}</p>
              <p className="text-xs text-slate-600">{estat.note}</p>
              <p className="text-xs text-slate-700">
                statsDataId: {estat.series?.statsDataId ?? "N/A"}
              </p>
              {estat.series?.data?.length ? (
                <ul className="mt-2 space-y-1">
                  {estat.series.data.slice(0, 4).map((item) => (
                    <li key={item.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-700">
                        <span className="truncate pr-2">{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-1.5 rounded bg-slate-200">
                        <div
                          className="h-1.5 rounded bg-slate-900"
                          style={{ width: `${Math.min(100, Math.round((item.value / maxStatValue) * 100))}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-slate-600">loading...</p>
          )}
        </div>
      </div>
    </section>
  );
}
