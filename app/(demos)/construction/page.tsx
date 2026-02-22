import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  mockDailyReportDraft,
  mockPhotoLedger,
  mockWorkflowGraph,
} from "@/lib/mock/construction";

export default function ConstructionDemoPage() {
  return (
    <DemoWorkspace
      demo="construction"
      title="建設デモ: Construction SiteOps Copilot"
      subtitle="Voice入力 → 日報/写真台帳成果物化 → 段取りWorkflow編集 → 承認までを通す。"
      suggestions={[
        "今日の出来高と安全指摘を整理して日報案を作ってください",
        "写真台帳を工程タグ別に分類して",
        "明日の段取りを3ステップで提案して",
      ]}
      initialQueue={[
        {
          id: "construction-initial-queue-1",
          title: "安全確認",
          description: "搬入動線の交差があるため誘導員配置を再確認。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={mockWorkflowGraph.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={mockDailyReportDraft.tomorrowPlan.map((plan, index) => ({
        id: `construction-task-${index}`,
        label: plan,
        done: false,
      }))}
      initialArtifacts={[
        {
          id: "construction-report-initial",
          name: "daily-report.json",
          kind: "json",
          content: JSON.stringify(mockDailyReportDraft, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "construction-photo-ledger",
          name: "photo-ledger.json",
          kind: "json",
          content: JSON.stringify(mockPhotoLedger, null, 2),
          updatedAt: new Date().toISOString(),
        },
      ]}
      enableVoice
      bottomPanel={
        <WorkflowEditor
          storageKey="workflow:construction"
          initialGraph={mockWorkflowGraph}
          title="Canvas Workflow: 明日の段取り"
        />
      }
    />
  );
}
