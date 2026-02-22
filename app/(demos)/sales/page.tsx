import { DemoScriptPanel } from "@/components/demos/demo-script-panel";
import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { SalesSourcePanel } from "@/components/demos/sales-source-panel";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  mockSalesAccountInsight,
  mockSalesOutreachDraft,
  mockSalesWorkflow,
} from "@/lib/mock/sales";

export default function SalesDemoPage() {
  return (
    <DemoWorkspace
      demo="sales"
      title="営業デモ: Sales Enablement Copilot"
      subtitle="アカウント調査 → 提案骨子生成 → 送付承認までを、営業オペレーションに沿って一気通貫で確認する。"
      suggestions={[
        "この顧客向けの提案骨子を3点で整理して",
        "初回商談用のメール案を作成して",
        "提案資料送付の承認フローを開始して",
      ]}
      scenarios={[
        {
          id: "sales-quick-flow",
          title: "提案作成から送付承認まで",
          description: "営業の定型フローを1分で再現。",
          outcome: "提案作成の初稿時間と承認待ち時間を短縮",
          targetDurationSec: 55,
          steps: [
            {
              id: "sales-step-1",
              label: "アカウント要約",
              prompt: "ターゲット企業の公開情報を要約して",
            },
            {
              id: "sales-step-2",
              label: "提案骨子作成",
              prompt: "課題仮説と導入効果を提案骨子にしてください。",
            },
            {
              id: "sales-step-3",
              label: "送付要求",
              prompt: "提案資料を顧客に送信してください。",
            },
            {
              id: "sales-step-4",
              label: "送付承認",
              prompt: "提案送付を承認します。",
              approved: true,
            },
          ],
        },
      ]}
      initialQueue={[
        {
          id: "sales-initial-queue-1",
          title: "提案レビュー待ち",
          description: "営業マネージャーのレビュー待ちが1件あります。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={mockSalesWorkflow.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={mockSalesOutreachDraft.followUpTasks.map((task, index) => ({
        id: `sales-task-${index}`,
        label: task,
        done: false,
      }))}
      initialArtifacts={[
        {
          id: "sales-account-initial",
          name: "account-brief.json",
          kind: "json",
          content: JSON.stringify(mockSalesAccountInsight, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "sales-outreach-initial",
          name: "outreach-plan.json",
          kind: "json",
          content: JSON.stringify(mockSalesOutreachDraft, null, 2),
          updatedAt: new Date().toISOString(),
        },
      ]}
      topPanel={
        <div className="space-y-4">
          <DemoScriptPanel
            title="営業: 調査から提案送付まで"
            summary="営業現場で詰まりやすい調査・骨子作成・承認の流れを短時間で再現。"
            durationSec={60}
            steps={[
              {
                id: "sales-script-1",
                at: "00:00",
                cue: "Research",
                value: "GitHub公開情報でアカウントの技術シグナルを取得",
              },
              {
                id: "sales-script-2",
                at: "00:18",
                cue: "Draft",
                value: "提案骨子とメール文面をArtifactとして生成",
              },
              {
                id: "sales-script-3",
                at: "00:40",
                cue: "Review",
                value: "Queue/Planで承認待ちを確認",
              },
              {
                id: "sales-script-4",
                at: "00:50",
                cue: "Approval",
                value: "送付操作はConfirmationで必ず承認",
              },
            ]}
          />
          <SalesSourcePanel />
        </div>
      }
      enableVoice
      bottomPanel={
        <WorkflowEditor
          storageKey="workflow:sales"
          initialGraph={mockSalesWorkflow}
          title="Canvas Workflow: 提案送付オペレーション"
        />
      }
    />
  );
}
