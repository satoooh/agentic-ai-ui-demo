"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainIcon, FileSearchIcon, GitCompareIcon, RadarIcon } from "lucide-react";

interface HighlightStep {
  id: string;
  label: string;
  description: string;
  status: "complete" | "active" | "pending";
  tags: string[];
}

interface AgenticHighlightsPanelProps {
  title?: string;
  badge?: string;
  summary?: string;
  steps?: HighlightStep[];
}

const defaultSteps: HighlightStep[] = [
  {
    id: "step-collect",
    label: "目的を分解し、収集戦略を立てる",
    description: "企業名/観点をクエリへ変換し、ソースごとの取得タスクを並列実行",
    status: "complete",
    tags: ["SEC filings", "GDELT news", "Wikidata profile"],
  },
  {
    id: "step-synthesize",
    label: "根拠リンク付きで示唆を合成",
    description: "シグナルを同時比較し、矛盾や鮮度差を明示",
    status: "active",
    tags: [],
  },
  {
    id: "step-iterate",
    label: "次ループの探索クエリを自動提案",
    description: "競合比較・追加検証にそのまま回せるクエリを生成",
    status: "pending",
    tags: [],
  },
];

const stepIcons = [FileSearchIcon, RadarIcon, GitCompareIcon];

export function AgenticHighlightsPanel({
  title = "Agentic Highlights",
  badge = "autonomous loop",
  summary = "このデモは「承認」ではなく、目的入力から次探索生成までの自律ループを主役にしています。",
  steps = defaultSteps,
}: AgenticHighlightsPanelProps) {
  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <Badge variant="secondary">{badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">{summary}</p>

        <ChainOfThought defaultOpen>
          <ChainOfThoughtHeader>What the agent is doing</ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            {steps.map((step, index) => (
              <ChainOfThoughtStep
                key={step.id}
                icon={stepIcons[index] ?? GitCompareIcon}
                label={step.label}
                description={step.description}
                status={step.status}
              >
                {step.tags.length > 0 ? (
                  <ChainOfThoughtSearchResults>
                    {step.tags.map((tag) => (
                      <ChainOfThoughtSearchResult key={tag}>{tag}</ChainOfThoughtSearchResult>
                    ))}
                  </ChainOfThoughtSearchResults>
                ) : null}
              </ChainOfThoughtStep>
            ))}
          </ChainOfThoughtContent>
        </ChainOfThought>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
          <p className="flex items-center gap-1.5 font-medium">
            <BrainIcon className="size-3.5 text-primary" />
            デモで見るべきポイント
          </p>
          <p className="mt-1 text-muted-foreground">
            Queue/Plan/Tool Logs が連動して更新され、探索が1回で終わらず反復されること。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
