"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResearchSignal } from "@/types/demo";

interface ResearchConnectorResponse {
  mode: "mock" | "live";
  signals: ResearchSignal[];
  note: string;
}

export function ResearchSourcePanel() {
  const [payload, setPayload] = useState<ResearchConnectorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<"auto" | "mock" | "live">("auto");
  const [query, setQuery] = useState("ai agents");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (modeOverride !== "auto") {
        params.set("mode", modeOverride);
      }
      if (query.trim()) {
        params.set("query", query.trim());
      }

      const response = await fetch(`/api/connectors/research-signal?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const parsed = (await response.json()) as ResearchConnectorResponse;
      setPayload(parsed);
      setLastFetchedAt(new Date().toLocaleTimeString("ja-JP"));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [modeOverride, query]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Research Signals (HN + GitHub)</CardTitle>
          <Badge variant={payload?.mode === "live" ? "default" : "secondary"}>
            {payload?.mode ?? "loading"}
          </Badge>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="query (ai agents, hiring automation...)"
            className="h-8 text-xs"
          />
          <Select
            value={modeOverride}
            onValueChange={(value) => setModeOverride(value as "auto" | "mock" | "live")}
          >
            <SelectTrigger className="h-8 w-32">
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
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {error ? <p className="text-red-600">{error}</p> : null}
        {payload ? <p className="text-muted-foreground">{payload.note}</p> : null}
        {lastFetchedAt ? <p className="text-muted-foreground">last: {lastFetchedAt}</p> : null}

        {payload ? (
          <ul className="space-y-2">
            {payload.signals.slice(0, 6).map((signal) => (
              <li key={signal.id} className="rounded-lg border border-border/70 bg-muted/15 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <a href={signal.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium underline">
                    {signal.title}
                  </a>
                  <Badge variant="outline">{signal.source}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{signal.summary}</p>
                <p className="mt-1 text-muted-foreground">score: {signal.score}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">loading...</p>
        )}
      </CardContent>
    </Card>
  );
}
