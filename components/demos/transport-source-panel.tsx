"use client";

import { useCallback, useEffect, useState } from "react";
import type { OperationEvent } from "@/types/demo";

interface ResponsePayload {
  mode: "mock" | "live";
  events: OperationEvent[];
  note: string;
}

export function TransportSourcePanel() {
  const [payload, setPayload] = useState<ResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<"auto" | "mock" | "live">("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const search = modeOverride === "auto" ? "" : `?mode=${modeOverride}`;
      const response = await fetch(`/api/connectors/odpt${search}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const parsed = (await response.json()) as ResponsePayload;
      setPayload(parsed);
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
        <h2 className="text-sm font-semibold text-slate-900">ODPT Connector</h2>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
            payload?.mode === "live"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {payload?.mode ?? "loading"}
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
      {payload ? (
        <>
          <p className="mt-2 text-xs text-slate-600">{payload.note}</p>
          <div className="mt-2 overflow-hidden rounded border border-slate-200">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-1">Line</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Details</th>
                  <th className="px-2 py-1">Source</th>
                </tr>
              </thead>
              <tbody>
                {payload.events.slice(0, 4).map((event) => (
                  <tr key={`${event.line}-${event.updatedAt}`} className="border-t border-slate-200">
                    <td className="px-2 py-1">{event.line}</td>
                    <td className="px-2 py-1">{event.status}</td>
                    <td className="px-2 py-1">{event.details}</td>
                    <td className="px-2 py-1">
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 underline"
                      >
                        link
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-1 text-xs text-slate-600">loading...</p>
      )}
    </section>
  );
}
