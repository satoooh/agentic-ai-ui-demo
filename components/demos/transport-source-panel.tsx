"use client";

import { useCallback, useEffect, useState } from "react";
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
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">ODPT Connector</CardTitle>
          <Badge variant={payload?.mode === "live" ? "default" : "secondary"}>
            {payload?.mode ?? "loading"}
          </Badge>
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
        {payload ? <p className="text-muted-foreground">{payload.note}</p> : null}

        {payload ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full border-collapse text-left">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="h-8 px-2 font-medium">Line</th>
                  <th className="h-8 px-2 font-medium">Status</th>
                  <th className="h-8 px-2 font-medium">Details</th>
                  <th className="h-8 px-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {payload.events.slice(0, 4).map((event) => (
                  <tr key={`${event.line}-${event.updatedAt}`} className="border-t">
                    <td className="px-2 py-1.5">{event.line}</td>
                    <td className="px-2 py-1.5">{event.status}</td>
                    <td className="px-2 py-1.5">{event.details}</td>
                    <td className="px-2 py-1.5">
                      <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        link
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">loading...</p>
        )}
      </CardContent>
    </Card>
  );
}
