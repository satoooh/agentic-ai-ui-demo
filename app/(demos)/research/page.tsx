import { DemoWorkspace } from "@/components/demos/demo-workspace";

export default function ResearchDemoPage() {
  return (
    <DemoWorkspace
      demo="research"
      title="企業調査AI"
      suggestions={[
        "トヨタ自動車のIR PDFと公開ニュースから懸念点を要約して",
        "MSFTの最新10-K/10-Qの示唆を営業提案向けに抽出して",
        "この結果を使って競合比較の探索クエリを提案して",
        "収集根拠のうち不足している情報を優先順位付きで示して",
      ]}
      scenarios={[]}
      initialQueue={[
        {
          id: "research-queue-1",
          title: "根拠リンク確認",
          description: "提出書類リンクとニュース発生日の整合性を確認してください。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
        {
          id: "research-queue-2",
          title: "競合比較へ展開",
          description: "次ループで同業他社（例: GOOGL, AMZN）へ展開してください。",
          severity: "info",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={[]}
      initialTasks={[]}
      initialArtifacts={[]}
      initialCitations={[]}
    />
  );
}
