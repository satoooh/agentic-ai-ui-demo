import Link from "next/link";
import {
  ArrowRightIcon,
  ListChecksIcon,
  PlayCircleIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const demos = [
  {
    href: "/sales",
    title: "営業: Sales Agentic Loop",
    summary: "アカウント収集 → 提案生成 → 反証探索 → 次アクション生成を1画面で反復。",
    focus: ["Queue", "Plan", "Tool", "Artifact", "Workflow", "OpenInChat"],
    value: "提案の初稿作成と改善ループを短縮",
  },
  {
    href: "/recruiting",
    title: "採用: Recruiting Agentic Loop",
    summary: "候補者要約 → 面接設計 → 懸念シミュレーション → 次探索生成を反復。",
    focus: ["SpeechInput", "Conversation", "Task", "Artifact", "Tool", "Checkpoint"],
    value: "採用進行の停滞と再探索コストを削減",
  },
  {
    href: "/research",
    title: "企業調査: Public Intelligence Studio",
    summary: "目的入力 → SEC/GDELT/Wikidata収集 → 根拠付き分析 → 次探索提案を実演。",
    focus: ["Sources", "InlineCitation", "Terminal", "TestResults", "StackTrace", "Commit"],
    value: "初回企業調査を根拠付きアウトプットへ即変換",
  },
];

const quickStartSteps = [
  "任意のデモを開き、左列の Run Scenario を押す",
  "中央 Conversation で入力文を編集し再送する",
  "右列 Execution/Ops/Audit で進捗・ツール・介入履歴を確認する",
  "下段 Artifacts で成果物を preview/copy/download する",
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-6 shadow-sm sm:p-7">
        <div className="absolute -right-8 -top-10 size-44 rounded-full bg-chart-2/10 blur-2xl" aria-hidden />
        <div className="absolute -left-14 -bottom-20 size-60 rounded-full bg-chart-1/10 blur-3xl" aria-hidden />

        <div className="relative grid gap-5 xl:grid-cols-[1.25fr_1fr]">
          <div className="space-y-4">
            <Badge className="w-fit" variant="secondary">
              <SparklesIcon className="size-3.5" />
              Agentic UI Demo Pack
            </Badge>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Japan Vertical Agentic Demo Lab
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-muted-foreground sm:text-base">
                「入力 → 収集 → 合成 → 反復」を業務フローとして再現するデモ環境です。既定は
                <code className="mx-1">mock</code>で確実に動作し、環境変数を設定すれば
                <code className="mx-1">live</code>連携へ段階移行できます。
              </p>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <p className="font-medium">画面設計の方針</p>
                <p className="mt-1 text-muted-foreground">
                  説明より操作優先。低優先情報は後段へ寄せ、主要導線を常に見える位置に固定。
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <p className="font-medium">実装ベース</p>
                <p className="mt-1 text-muted-foreground">
                  shadcn/ui + AI Elements を統一採用。各デモで Chat / Workflow / Voice / Code を主役化。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/sales">
                  デモをすぐ開始
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/settings">
                  環境変数を確認
                  <ListChecksIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="h-fit border-border/70 bg-background/75">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircleIcon className="size-4 text-primary" />
                3分デモの進め方
              </CardTitle>
              <CardDescription>読むより触る。最初の操作が一目で分かる導線にしています。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="space-y-2 text-sm text-muted-foreground">
                {quickStartSteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5 min-w-6 justify-center px-1.5">
                      {index + 1}
                    </Badge>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href="/recruiting">
                    採用デモを開く
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/research">
                    リサーチデモを開く
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {demos.map((demo) => (
          <SectionCard key={demo.href} title={demo.title} description={demo.summary}>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2 text-xs">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <WorkflowIcon className="size-3.5 text-primary" />
                想定インパクト
              </p>
              <p className="mt-1 text-muted-foreground">{demo.value}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {demo.focus.map((item) => (
                <Badge key={item} variant="outline" className="text-[11px]">
                  {item}
                </Badge>
              ))}
            </div>
            <Button asChild className="w-full justify-between">
              <Link href={demo.href}>
                デモを開く
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </SectionCard>
        ))}
      </section>
    </div>
  );
}
