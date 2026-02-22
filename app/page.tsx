import Link from "next/link";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const demos = [
  {
    href: "/construction",
    title: "建設: Construction SiteOps Copilot",
    summary: "Voice + Attachments + Workflow(Canvas) で現場入力から日報/台帳/段取りまでを通す。",
    focus: ["SpeechInput", "Transcription", "Artifact", "FileTree", "Canvas", "Confirmation"],
  },
  {
    href: "/transport",
    title: "公共交通: Transport Control Desk",
    summary: "運行監視(Queue) → 文面生成(Message分岐) → 放送(TTS) → 掲出(WebPreview)の流れを体験する。",
    focus: ["Queue", "Tool", "Message", "VoiceSelector", "AudioPlayer", "JSXPreview"],
  },
  {
    href: "/gov-insight",
    title: "官公庁データ活用: Gov Data Insight Studio",
    summary: "探索(ChainOfThought) → 根拠付きレポート → コネクタIDE(擬似実行) → 承認配布を1画面で示す。",
    focus: ["Sources", "InlineCitation", "Artifact", "Terminal", "TestResults", "StackTrace"],
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card/95 p-6 shadow-sm">
        <div className="absolute -right-8 -top-12 size-40 rounded-full bg-chart-2/10 blur-2xl" aria-hidden />
        <div className="absolute -left-10 -bottom-16 size-52 rounded-full bg-chart-1/10 blur-3xl" aria-hidden />
        <div className="relative space-y-4">
          <Badge className="w-fit" variant="secondary">
            <SparklesIcon className="size-3.5" />
            Agentic UI Demo Pack
          </Badge>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Japan Vertical Agentic Demo Lab
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
              このセットアップは `mock` 前提で必ず動作し、環境変数を設定すれば `live` 連携を段階的に追加できる土台です。
              各デモは「入力 → 進捗 → 成果物 → 承認」を揃えています。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/settings">
                環境変数を確認
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Card className="border-dashed bg-background/70">
              <CardContent className="px-3 py-1.5 text-xs text-muted-foreground">
                Runbook: <code>RUNBOOK.md</code>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {demos.map((demo) => (
          <SectionCard key={demo.href} title={demo.title} description={demo.summary}>
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
      </div>
    </div>
  );
}

