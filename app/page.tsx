import Link from "next/link";
import { SectionCard } from "@/components/common/section-card";

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
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Japan Vertical Agentic Demo Lab</h1>
        <p className="mt-3 text-slate-700">
          このセットアップは、`mock` 前提で必ず動作し、環境変数を設定すれば `live` 連携を段階的に追加できる土台です。
          各デモは「入力 → 進捗 → 成果物 → 承認」を揃えています。
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/settings" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            環境変数を確認
          </Link>
          <span className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
            Runbook: /RUNBOOK.md
          </span>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {demos.map((demo) => (
          <SectionCard key={demo.href} title={demo.title} description={demo.summary}>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {demo.focus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href={demo.href} className="mt-4 inline-block rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              デモを開く
            </Link>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
