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
import type { SalesAccountInsight } from "@/types/demo";

interface SalesConnectorResponse {
  mode: "mock" | "live";
  insight: SalesAccountInsight;
  note: string;
}

export function SalesSourcePanel() {
  const [payload, setPayload] = useState<SalesConnectorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modeOverride, setModeOverride] = useState<"auto" | "mock" | "live">("auto");
  const [orgInput, setOrgInput] = useState("vercel");
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
      if (orgInput.trim()) {
        params.set("org", orgInput.trim());
      }
      const query = params.toString();
      const response = await fetch(`/api/connectors/sales-account${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const parsed = (await response.json()) as SalesConnectorResponse;
      setPayload(parsed);
      setLastFetchedAt(new Date().toLocaleTimeString("ja-JP"));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [modeOverride, orgInput]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Account Connector (GitHub)</CardTitle>
          <Badge variant={payload?.mode === "live" ? "default" : "secondary"}>
            {payload?.mode ?? "loading"}
          </Badge>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={orgInput}
            onChange={(event) => setOrgInput(event.target.value)}
            placeholder="org (e.g. vercel)"
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
          <div className="rounded-lg border border-border/70 bg-muted/15 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{payload.insight.displayName}</p>
              <a href={payload.insight.website} target="_blank" rel="noopener noreferrer" className="underline">
                website
              </a>
            </div>
            <p className="mt-1 text-muted-foreground">
              @{payload.insight.orgLogin} / followers {payload.insight.followers} / repos {payload.insight.publicRepos}
            </p>
            <ul className="mt-2 space-y-1">
              {payload.insight.topRepositories.slice(0, 3).map((repo) => (
                <li key={repo.url} className="flex items-center justify-between gap-2">
                  <a href={repo.url} target="_blank" rel="noopener noreferrer" className="truncate underline">
                    {repo.name}
                  </a>
                  <span className="text-muted-foreground">★{repo.stars}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground">loading...</p>
        )}
      </CardContent>
    </Card>
  );
}
