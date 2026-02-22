"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RecruitingJobPosting } from "@/types/demo";

interface RecruitingConnectorResponse {
  mode: "live";
  jobs: RecruitingJobPosting[];
  note: string;
}

export function RecruitingSourcePanel() {
  const [payload, setPayload] = useState<RecruitingConnectorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("engineer");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("query", query.trim());
      }
      const response = await fetch(`/api/connectors/recruiting-market?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const parsed = (await response.json()) as RecruitingConnectorResponse;
      setPayload(parsed);
      setLastFetchedAt(new Date().toLocaleTimeString("ja-JP"));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Recruiting Market Connector</CardTitle>
          <Badge variant="secondary">live data</Badge>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-[1fr_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="query (engineer, recruiter...)"
            className="h-8 text-xs"
          />
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
          <div className="overflow-hidden rounded-lg border border-border/70">
            <table className="w-full border-collapse text-left">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="h-8 px-2 font-medium">Role</th>
                  <th className="h-8 px-2 font-medium">Company</th>
                  <th className="h-8 px-2 font-medium">Location</th>
                  <th className="h-8 px-2 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {payload.jobs.slice(0, 6).map((job) => (
                  <tr key={job.id} className="border-t">
                    <td className="px-2 py-1.5">{job.title}</td>
                    <td className="px-2 py-1.5">{job.company}</td>
                    <td className="px-2 py-1.5">{job.location}</td>
                    <td className="px-2 py-1.5">
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="underline">
                        open
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
