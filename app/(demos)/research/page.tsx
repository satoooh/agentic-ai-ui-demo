import { AgenticHighlightsPanel } from "@/components/demos/agentic-highlights-panel";
import { CodeLabPanel } from "@/components/demos/code-lab-panel";
import { DemoScriptPanel } from "@/components/demos/demo-script-panel";
import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { ResearchSourcePanel } from "@/components/demos/research-source-panel";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  mockResearchConnectorProject,
  mockResearchEvidence,
  mockResearchSignals,
  mockResearchWorkflow,
} from "@/lib/mock/research";

export default function ResearchDemoPage() {
  return (
    <DemoWorkspace
      demo="research"
      title="企業リサーチデモ: Public Intelligence Studio"
      subtitle="目的入力 → 自律リサーチループ（収集/要約/再探索）→ 根拠付きアウトプット生成までを、Agentic UIとして実演する。"
      suggestions={[
        "トヨタ自動車のIRと公開ニュースから懸念点を要約して",
        "MSFTの最新10-K/10-Qの示唆を営業提案向けに抽出して",
        "SONYの企業プロフィールをWikidataで補完して",
        "この結果を使って競合比較の探索クエリを自動提案して",
      ]}
      scenarios={[
        {
          id: "research-agentic-loop",
          title: "自律リサーチループ",
          description: "目標入力→情報収集→根拠付き要約→次ループ提案までを再現。",
          outcome: "初回調査の立ち上がりを30分以内に短縮",
          targetDurationSec: 85,
          steps: [
            {
              id: "research-step-1",
              label: "目的入力",
              prompt: "Microsoftを対象に、AI投資トレンド観点で企業調査を開始してください。",
            },
            {
              id: "research-step-2",
              label: "IR収集",
              prompt: "SEC提出書類から、財務と戦略の変化点を3つ抽出してください。",
            },
            {
              id: "research-step-3",
              label: "外部シグナル統合",
              prompt: "GDELTニュースとWikidata属性を統合し、リスクと機会を3点ずつ整理してください。",
            },
            {
              id: "research-step-4",
              label: "次ループ生成",
              prompt: "この結果を使って、競合比較の次探索クエリを3案作ってください。",
            },
          ],
        },
      ]}
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
      initialPlan={mockResearchWorkflow.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={[
        { id: "research-task-1", label: "対象企業の識別子確定（社名/ティッカー）", done: false },
        { id: "research-task-2", label: "IR提出書類の差分確認", done: false },
        { id: "research-task-3", label: "ニュース由来リスクの一次評価", done: false },
        { id: "research-task-4", label: "次探索クエリの設計", done: false },
      ]}
      initialArtifacts={[
        {
          id: "ir-filings-initial",
          name: "ir-filings.json",
          kind: "json",
          content: JSON.stringify(mockResearchSignals.filter((signal) => signal.kind === "ir_filing"), null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "public-signals-initial",
          name: "public-signals.json",
          kind: "json",
          content: JSON.stringify(mockResearchSignals.filter((signal) => signal.kind === "public_news"), null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "company-profile-initial",
          name: "company-profile.json",
          kind: "json",
          content: JSON.stringify(mockResearchSignals.filter((signal) => signal.kind === "regulatory_note"), null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "company-brief",
          name: "company-brief.md",
          kind: "markdown",
          content:
            "# 企業調査ブリーフ（初期）\n\n" +
            "- 対象: Microsoft\n" +
            "- 収集対象: SEC / GDELT / Wikidata\n" +
            "- 次アクション: 重要提出書類の差分と公開ニュースの整合を確認",
          updatedAt: new Date().toISOString(),
        },
        {
          id: "connector-project",
          name: "connector-project.json",
          kind: "json",
          content: JSON.stringify(mockResearchConnectorProject, null, 2),
          updatedAt: new Date().toISOString(),
        },
      ]}
      initialCitations={mockResearchEvidence.map((evidence, index) => ({
        id: `research-citation-${index}`,
        title: evidence.sourceTitle,
        url: evidence.url,
        quote: evidence.quote,
      }))}
      topPanel={
        <div className="space-y-4">
          <DemoScriptPanel
            title="企業リサーチ: 自律ループ実演"
            summary="入力した目的に対し、エージェントが収集→統合→要約→次探索提案を反復。"
            durationSec={85}
            steps={[
              {
                id: "research-script-1",
                at: "00:00",
                cue: "Goal",
                value: "目的（例: AI投資トレンド）を入力",
              },
              {
                id: "research-script-2",
                at: "00:18",
                cue: "Plan",
                value: "SEC/GDELT/WikidataからIR・公開情報を取得",
              },
              {
                id: "research-script-3",
                at: "00:42",
                cue: "Synthesize",
                value: "根拠リンク付きで示唆と懸念点を整理",
              },
              {
                id: "research-script-4",
                at: "01:00",
                cue: "Validate",
                value: "Connector IDEでテスト→エラー→再実行を確認",
              },
              {
                id: "research-script-5",
                at: "01:20",
                cue: "Iterate",
                value: "次探索クエリを生成し、比較調査へ展開",
              },
            ]}
          />
          <AgenticHighlightsPanel />
          <ResearchSourcePanel />
        </div>
      }
      bottomPanel={
        <div className="space-y-4">
          <CodeLabPanel
            title="Research Connector IDE"
            snippets={[
              {
                id: "snippet-sec",
                fileName: "connectors/sec-edgar.ts",
                language: "ts",
                content:
                  "export async function fetchSecSubmissions(cik: string, userAgent: string) {\n" +
                  "  const endpoint = `https://data.sec.gov/submissions/CIK${cik}.json`;\n" +
                  "  const response = await fetch(endpoint, { headers: { 'User-Agent': userAgent } });\n" +
                  "  if (!response.ok) throw new Error(`status ${response.status}`);\n" +
                  "  return response.json();\n" +
                  "}\n",
              },
              {
                id: "snippet-gdelt",
                fileName: "connectors/gdelt.ts",
                language: "ts",
                content:
                  "export async function fetchPublicNews(query: string) {\n" +
                  "  const endpoint = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=5&format=json`;\n" +
                  "  const response = await fetch(endpoint);\n" +
                  "  if (!response.ok) throw new Error(`status ${response.status}`);\n" +
                  "  return response.json();\n" +
                  "}\n",
              },
              {
                id: "snippet-wikidata",
                fileName: "connectors/wikidata.ts",
                language: "ts",
                content:
                  "export async function fetchCompanyProfile(query: string) {\n" +
                  "  const params = new URLSearchParams({\n" +
                  "    action: 'wbsearchentities', format: 'json', language: 'ja', type: 'item', search: query,\n" +
                  "  });\n" +
                  "  const endpoint = `https://www.wikidata.org/w/api.php?${params.toString()}`;\n" +
                  "  const response = await fetch(endpoint);\n" +
                  "  if (!response.ok) throw new Error(`status ${response.status}`);\n" +
                  "  return response.json();\n" +
                  "}\n",
              },
            ]}
            envVars={["DEMO_MODE", "SEC_USER_AGENT"]}
          />
          <WorkflowEditor
            storageKey="workflow:research"
            initialGraph={mockResearchWorkflow}
            title="Canvas Workflow: 企業調査ブリーフ配布"
          />
        </div>
      }
    />
  );
}
