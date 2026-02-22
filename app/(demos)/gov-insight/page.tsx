import { CodeLabPanel } from "@/components/demos/code-lab-panel";
import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { GovSourcePanel } from "@/components/demos/gov-source-panel";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  mockConnectorProject,
  mockDatasetCandidates,
  mockEvidence,
  mockStatSeries,
} from "@/lib/mock/gov";

const automationWorkflow = {
  nodes: [
    { id: "gw-1", label: "データ収集", owner: "connector", status: "done" as const },
    { id: "gw-2", label: "整形", owner: "pipeline", status: "doing" as const },
    { id: "gw-3", label: "レポート生成", owner: "agent", status: "todo" as const },
    { id: "gw-4", label: "承認", owner: "reviewer", status: "todo" as const },
  ],
  edges: [
    { from: "gw-1", to: "gw-2" },
    { from: "gw-2", to: "gw-3" },
    { from: "gw-3", to: "gw-4" },
  ],
};

export default function GovInsightDemoPage() {
  return (
    <DemoWorkspace
      demo="gov-insight"
      title="官公庁データ活用デモ: Gov Data Insight Studio"
      subtitle="探索 → 根拠付きレポート → コネクタIDE → 自動化Workflowの流れを確認する。"
      suggestions={[
        "人口推計データから主要都市比較のレポートを作成",
        "出典URL付きでサマリを生成して",
        "定期実行用のコネクタ雛形コードを出して",
      ]}
      initialQueue={mockDatasetCandidates.map((candidate, index) => ({
        id: `gov-initial-queue-${index}`,
        title: candidate.title,
        description: `${candidate.org} / ${candidate.apiHint}`,
        severity: "info",
        timestamp: new Date().toISOString(),
      }))}
      initialPlan={[
        { id: "gov-plan-1", title: "テーマ分解", status: "done" },
        { id: "gov-plan-2", title: "e-Gov候補探索", status: "doing" },
        { id: "gov-plan-3", title: "e-Stat取得", status: "todo" },
      ]}
      initialTasks={[
        { id: "gov-task-1", label: "引用元URLの検証", done: false },
        { id: "gov-task-2", label: "配布前承認", done: false },
      ]}
      initialArtifacts={[
        {
          id: "gov-stats-initial",
          name: "stat-series.json",
          kind: "json",
          content: JSON.stringify(mockStatSeries, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "gov-connector-project",
          name: "connector-project.json",
          kind: "json",
          content: JSON.stringify(mockConnectorProject, null, 2),
          updatedAt: new Date().toISOString(),
        },
      ]}
      initialCitations={mockEvidence.map((evidence, index) => ({
        id: `gov-citation-${index}`,
        title: evidence.sourceTitle,
        url: evidence.url,
        quote: evidence.quote,
      }))}
      topPanel={<GovSourcePanel />}
      bottomPanel={
        <div className="space-y-4">
          <CodeLabPanel
            title="Connector IDE Sandbox"
            snippets={[
              {
                id: "snippet-estat",
                fileName: "connectors/estat.ts",
                language: "ts",
                content:
                  "export async function fetchEstat(appId: string, statsDataId: string) {\n  // TODO: call e-Stat API\n  return { appId, statsDataId };\n}",
              },
              {
                id: "snippet-egov",
                fileName: "connectors/egov.ts",
                language: "ts",
                content:
                  "export async function searchDatasets(query: string) {\n  // TODO: call e-Gov metadata API\n  return [{ query }];\n}",
              },
            ]}
            envVars={["ESTAT_APP_ID", "DEMO_MODE"]}
          />
          <WorkflowEditor
            storageKey="workflow:gov"
            initialGraph={automationWorkflow}
            title="Canvas Workflow: 定期レポート自動化"
          />
        </div>
      }
    />
  );
}
