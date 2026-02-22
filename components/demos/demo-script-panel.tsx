"use client";

import { useMemo, useState } from "react";
import { CopyIcon, TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DemoScriptStep {
  id: string;
  at: string;
  cue: string;
  value: string;
}

interface DemoScriptPanelProps {
  title: string;
  summary: string;
  durationSec: number;
  steps: DemoScriptStep[];
}

export function DemoScriptPanel({ title, summary, durationSec, steps }: DemoScriptPanelProps) {
  const [copied, setCopied] = useState(false);

  const scriptText = useMemo(
    () =>
      [
        `${title} (${durationSec}秒)`,
        summary,
        ...steps.map((step) => `${step.at} ${step.cue} | ${step.value}`),
      ].join("\n"),
    [durationSec, steps, summary, title],
  );

  const copyScript = async () => {
    await navigator.clipboard.writeText(scriptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm">1-minute Demo Script</CardTitle>
            <p className="mt-1 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <TimerIcon className="size-3.5" />
              {durationSec}s
            </Badge>
            <Button type="button" size="sm" variant="outline" onClick={() => void copyScript()}>
              <CopyIcon className="size-3.5" />
              {copied ? "copied" : "copy script"}
            </Button>
          </div>
        </div>
        <Progress value={copied ? 100 : 0} className="h-1.5" />
      </CardHeader>

      <CardContent className="grid gap-2 md:grid-cols-2">
        {steps.map((step) => (
          <div key={step.id} className="rounded-lg border bg-muted/25 p-2.5 text-xs">
            <p className="font-semibold">
              {step.at} {step.cue}
            </p>
            <p className="mt-1 text-muted-foreground">{step.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

