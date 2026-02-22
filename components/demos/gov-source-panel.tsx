"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function fetchData() {
      try {
        const [egovResponse, estatResponse] = await Promise.all([
          fetch("/api/connectors/egov"),
          fetch("/api/connectors/estat"),
        ]);

        if (!egovResponse.ok || !estatResponse.ok) {
          throw new Error(`status ${egovResponse.status}/${estatResponse.status}`);
        }

        setEgov((await egovResponse.json()) as EgovResponse);
        setEstat((await estatResponse.json()) as EstatResponse);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "unknown error");
      }
    }

    void fetchData();
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">e-Gov / e-Stat Connectors</h2>
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
                  <li key={candidate.title}>{candidate.title}</li>
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
            </>
          ) : (
            <p className="text-xs text-slate-600">loading...</p>
          )}
        </div>
      </div>
    </section>
  );
}
