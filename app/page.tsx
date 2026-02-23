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
    href: "/meeting",
    title: "会議レビューAI",
    summary: "議事録入力 → 決定事項抽出 → 反証レビュー（悪魔の代弁者）→ 実行アクション確定を1チャットで反復。",
    focus: ["Conversation", "Reasoning", "PromptInput", "Suggestion", "Sources", "Artifact"],
    value: "会議後の合意形成と実行速度を向上",
  },
  {
    href: "/research",
    title: "企業調査AI",
    summary: "調査目的入力 → Gemini Web検索（PDF優先）→ 根拠付き分析 → 次アクション提案を1チャットで反復。",
    focus: ["Conversation", "Reasoning", "Sources", "InlineCitation", "PromptInput", "Artifact"],
    value: "初回企業調査を根拠付きアウトプットへ即変換（IR/PDFリンク付き）",
  },
];

const quickStartSteps = [
  "まず「会議レビュー」デモを開き、議事録を貼り付けて確定する",
  "チャットに目的を1行で入力し、会議レビューを開始する",
  "提案される次入力チップを押して、反証→修正→次アクション生成を回す",
  "企業調査AIでPDF根拠リンク付きの比較メモを生成し、成果物からコピー/共有する",
];

export default function HomePage() {
  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/92 p-6 shadow-[0_1px_0_rgb(255_255_255/0.72)_inset,0_18px_42px_rgb(15_23_42/0.08)] sm:p-8">
        <div className="absolute -right-10 -top-14 size-56 rounded-full bg-primary/16 blur-3xl" aria-hidden />
        <div className="absolute -left-16 -bottom-24 size-72 rounded-full bg-chart-2/14 blur-3xl" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-chart-2/[0.08]" aria-hidden />

        <div className="relative grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <div className="space-y-5">
            <Badge className="w-fit" variant="secondary">
              <SparklesIcon className="size-3.5" />
              Agentic UI Demo Pack
            </Badge>

            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Agentic UI Demo
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base">
                「会議レビュー」と「企業調査」を、チャット中心のエージェントUIで検証するデモです。
                目的を分解し、収集戦略を立て、根拠付きで要点化する流れをシンプルに体験できます。
              </p>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-background/88 p-4 shadow-[0_1px_0_0_rgb(255_255_255/0.56)_inset]">
                <p className="font-display font-bold">画面設計の方針</p>
                <p className="mt-1 text-muted-foreground">
                  説明より操作優先。低優先情報は後段へ寄せ、主要導線を常に見える位置に固定。
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/88 p-4 shadow-[0_1px_0_0_rgb(255_255_255/0.56)_inset]">
                <p className="font-display font-bold">実装ベース</p>
                <p className="mt-1 text-muted-foreground">
                  shadcn/ui + AI Elements を統一採用。チャット中心UIと根拠提示（Sources/InlineCitation）を主役化。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/meeting">
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

          <Card className="h-fit border-border/80 bg-background/84 shadow-[0_1px_0_rgb(255_255_255/0.72)_inset,0_16px_32px_rgb(15_23_42/0.08)]">
            <CardHeader className="pb-3">
              <CardTitle className="font-display flex items-center gap-2 text-lg font-bold">
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
                  <Link href="/meeting">
                    会議レビューを開く
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/research">
                    企業調査デモを開く
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {demos.map((demo) => (
          <SectionCard key={demo.href} title={demo.title} description={demo.summary}>
            <div className="rounded-xl border border-border/80 bg-muted/22 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <WorkflowIcon className="size-3.5 text-primary" />
                想定インパクト
              </p>
              <p className="mt-1 text-muted-foreground">{demo.value}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {demo.focus.slice(0, 4).map((item) => (
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
