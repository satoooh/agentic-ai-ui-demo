"use client";

import { useEffect, useState } from "react";
import type { OperationEvent } from "@/types/demo";

interface ResponsePayload {
  mode: "mock" | "live";
  events: OperationEvent[];
  note: string;
}

export function TransportSourcePanel() {
  const [payload, setPayload] = useState<ResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/connectors/odpt");
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }

        const parsed = (await response.json()) as ResponsePayload;
        setPayload(parsed);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "unknown error");
      }
    }

    void fetchData();
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">ODPT Connector</h2>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      {payload ? (
        <>
          <p className="mt-1 text-xs text-slate-700">mode: {payload.mode}</p>
          <p className="text-xs text-slate-600">{payload.note}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-700">
            {payload.events.slice(0, 3).map((event) => (
              <li key={`${event.line}-${event.updatedAt}`}>
                {event.line}: {event.status} / {event.details}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-xs text-slate-600">loading...</p>
      )}
    </section>
  );
}
