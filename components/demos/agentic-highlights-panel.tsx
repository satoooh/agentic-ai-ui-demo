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

export function AgenticHighlightsPanel() {
  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Agentic Highlights</CardTitle>
          <Badge variant="secondary">autonomous loop</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground">
          このデモは「承認」ではなく、目的入力から次探索生成までの自律ループを主役にしています。
        </p>

        <ChainOfThought defaultOpen>
          <ChainOfThoughtHeader>What the agent is doing</ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            <ChainOfThoughtStep
              icon={FileSearchIcon}
              label="目的を分解し、収集戦略を立てる"
              description="企業名/観点をクエリへ変換し、ソースごとの取得タスクを並列実行"
              status="complete"
            >
              <ChainOfThoughtSearchResults>
                <ChainOfThoughtSearchResult>SEC filings</ChainOfThoughtSearchResult>
                <ChainOfThoughtSearchResult>GDELT news</ChainOfThoughtSearchResult>
                <ChainOfThoughtSearchResult>Wikidata profile</ChainOfThoughtSearchResult>
              </ChainOfThoughtSearchResults>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep
              icon={RadarIcon}
              label="根拠リンク付きで示唆を合成"
              description="シグナルを同時比較し、矛盾や鮮度差を明示"
              status="active"
            />

            <ChainOfThoughtStep
              icon={GitCompareIcon}
              label="次ループの探索クエリを自動提案"
              description="競合比較・追加検証にそのまま回せるクエリを生成"
              status="pending"
            />
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

