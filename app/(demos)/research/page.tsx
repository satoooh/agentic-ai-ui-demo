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
      subtitle="企業指定 → 公開IR/ニュース/企業属性収集 → 根拠付き分析 → 配布承認までを、実務向けリサーチ導線で実演する。"
      suggestions={[
        "トヨタ自動車のIRと公開ニュースから懸念点を要約して",
        "MSFTの最新10-K/10-Qの示唆を営業提案向けに抽出して",
        "SONYの企業プロフィールをWikidataで補完して",
        "この企業調査レポートを配布承認に回して",
      ]}
      scenarios={[
        {
          id: "research-company-brief",
          title: "企業IRクイックブリーフ生成",
          description: "企業名入力→IR/公開情報収集→承認配布までを再現。",
          outcome: "初回調査の立ち上がりを30分以内に短縮",
          targetDurationSec: 75,
          steps: [
            {
              id: "research-step-1",
              label: "企業指定",
              prompt: "Microsoftを対象に企業調査を開始してください。",
            },
            {
              id: "research-step-2",
              label: "IR収集",
              prompt: "SECの提出書類から直近の重要ポイントを抽出してください。",
            },
            {
              id: "research-step-3",
              label: "公開情報分析",
              prompt: "公開ニュースとWikidataの企業属性も合わせてリスクと機会を3点ずつ整理してください。",
            },
            {
              id: "research-step-4",
              label: "配布要求",
              prompt: "この企業調査ブリーフを社内へ配布してください。",
            },
            {
              id: "research-step-5",
              label: "配布承認",
              prompt: "企業調査ブリーフの配布を承認します。",
              approved: true,
            },
          ],
        },
      ]}
      initialQueue={[
        {
          id: "research-queue-1",
          title: "IR根拠リンク確認",
          description: "配布前に提出書類リンクと日付の整合性を確認してください。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
        {
          id: "research-queue-2",
          title: "企業同名注意",
          description: "ティッカーと法人名の一致確認が必要です。",
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
        { id: "research-task-4", label: "配布承認", done: false },
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
            title="企業リサーチ: 収集から配布承認まで"
            summary="企業名を起点にIRと公開情報を統合収集し、根拠付きで配布判断まで実行。"
            durationSec={75}
            steps={[
              {
                id: "research-script-1",
                at: "00:00",
                cue: "Target",
                value: "対象企業（社名/ティッカー）を指定",
              },
              {
                id: "research-script-2",
                at: "00:18",
                cue: "Collect",
                value: "SEC/GDELT/WikidataからIR・公開情報を取得",
              },
              {
                id: "research-script-3",
                at: "00:42",
                cue: "Analyze",
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
                at: "01:10",
                cue: "Approve",
                value: "配布操作をConfirmationで承認",
              },
            ]}
          />
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
