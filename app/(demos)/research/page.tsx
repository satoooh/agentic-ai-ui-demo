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
      title="リサーチデモ: IT Research Agent Studio"
      subtitle="探索 → 根拠付きブリーフ → コネクタIDE検証 → 配布承認までを、IT業務の調査フローとして実演する。"
      suggestions={[
        "今週のAIエージェント関連トピックを要約して",
        "営業提案に転用できる示唆を抽出して",
        "このブリーフを配布承認に回して",
      ]}
      scenarios={[
        {
          id: "research-weekly-brief",
          title: "週次リサーチ配布フロー",
          description: "収集→要約→配布承認までを再現。",
          outcome: "調査メモから共有資料化までの時間短縮",
          targetDurationSec: 65,
          steps: [
            {
              id: "research-step-1",
              label: "外部シグナル収集",
              prompt: "最新のIT業務効率化シグナルを要約してください。",
            },
            {
              id: "research-step-2",
              label: "根拠付きブリーフ生成",
              prompt: "引用URL付きでレポート草案を作成してください。",
            },
            {
              id: "research-step-3",
              label: "配布要求",
              prompt: "このブリーフをチームへ配布してください。",
            },
            {
              id: "research-step-4",
              label: "配布承認",
              prompt: "レポート配布を承認します。",
              approved: true,
            },
          ],
        },
      ]}
      initialQueue={[
        {
          id: "research-queue-1",
          title: "根拠リンク確認",
          description: "配布前に参照リンクの有効性を確認してください。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={mockResearchWorkflow.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={[
        { id: "research-task-1", label: "引用元URLの確認", done: false },
        { id: "research-task-2", label: "結論スライド化", done: false },
        { id: "research-task-3", label: "配布承認", done: false },
      ]}
      initialArtifacts={[
        {
          id: "research-signals-initial",
          name: "research-signals.json",
          kind: "json",
          content: JSON.stringify(mockResearchSignals, null, 2),
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
            title="リサーチ: 収集から配布承認まで"
            summary="情報収集・要約・配布承認を一つのエージェントUIに統合。"
            durationSec={65}
            steps={[
              {
                id: "research-script-1",
                at: "00:00",
                cue: "Collect",
                value: "HN/GitHubの外部シグナルを収集",
              },
              {
                id: "research-script-2",
                at: "00:20",
                cue: "Summarize",
                value: "SourcesとInlineCitation付きで要約生成",
              },
              {
                id: "research-script-3",
                at: "00:38",
                cue: "Validate",
                value: "Connector IDEでテスト→エラー→再実行を確認",
              },
              {
                id: "research-script-4",
                at: "00:55",
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
                id: "snippet-github",
                fileName: "connectors/github.ts",
                language: "ts",
                content:
                  "export async function fetchOrgInsight(org: string) {\n" +
                  "  const response = await fetch(`https://api.github.com/orgs/${org}`);\n" +
                  "  if (!response.ok) throw new Error(`status ${response.status}`);\n" +
                  "  return response.json();\n" +
                  "}\n",
              },
              {
                id: "snippet-hn",
                fileName: "connectors/hn.ts",
                language: "ts",
                content:
                  "export async function fetchHnSignals(query: string) {\n" +
                  "  const endpoint = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}`;\n" +
                  "  const response = await fetch(endpoint);\n" +
                  "  return response.json();\n" +
                  "}\n",
              },
            ]}
            envVars={["DEMO_MODE", "GITHUB_TOKEN"]}
          />
          <WorkflowEditor
            storageKey="workflow:research"
            initialGraph={mockResearchWorkflow}
            title="Canvas Workflow: 週次ブリーフ配布"
          />
        </div>
      }
    />
  );
}
