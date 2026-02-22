"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

  const modeLabel = (egov?.mode ?? estat?.mode) ?? "loading";

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">e-Gov / e-Stat Connectors</CardTitle>
          <Badge variant={modeLabel === "live" ? "default" : "secondary"}>{modeLabel}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Select
            value={modeOverride}
            onValueChange={(value) => setModeOverride(value as "auto" | "mock" | "live")}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">mode: auto</SelectItem>
              <SelectItem value="mock">mode: mock</SelectItem>
              <SelectItem value="live">mode: live</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={() => void fetchData()}>
            <RefreshCcwIcon className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "refreshing..." : "refresh"}
          </Button>
          {lastFetchedAt ? <span>last: {lastFetchedAt}</span> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {error ? <p className="text-red-600">{error}</p> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">e-Gov</p>
              <Badge variant="outline">{egov?.mode ?? "loading"}</Badge>
            </div>
            {egov ? (
              <>
                <p className="mt-2 text-muted-foreground">{egov.note}</p>
                <Separator className="my-2" />
                <ul className="space-y-1">
                  {egov.candidates.slice(0, 3).map((candidate) => (
                    <li key={candidate.title}>
                      <a href={candidate.landingUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        {candidate.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-muted-foreground">loading...</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">e-Stat</p>
              <Badge variant="outline">{estat?.mode ?? "loading"}</Badge>
            </div>
            {estat ? (
              <>
                <p className="mt-2 text-muted-foreground">{estat.note}</p>
                <p className="mt-1 text-muted-foreground">statsDataId: {estat.series?.statsDataId ?? "N/A"}</p>
                {estat.series?.data?.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {estat.series.data.slice(0, 4).map((item) => (
                      <li key={item.label} className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                        <div className="h-1.5 rounded bg-muted">
                          <div
                            className="h-1.5 rounded bg-primary"
                            style={{ width: `${Math.min(100, Math.round((item.value / maxStatValue) * 100))}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-2 text-muted-foreground">loading...</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

