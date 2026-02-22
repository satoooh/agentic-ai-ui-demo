import { DemoScriptPanel } from "@/components/demos/demo-script-panel";
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
      scenarios={[
        {
          id: "construction-quick-run",
          title: "現場日報の通しデモ",
          description: "音声メモ想定の入力から提出承認までを短時間で再現。",
          outcome: "日報作成と提出確認の往復時間を短縮",
          targetDurationSec: 50,
          steps: [
            {
              id: "construction-step-1",
              label: "日報ドラフト生成",
              prompt: "本日の作業内容から日報ドラフトを作ってください。",
            },
            {
              id: "construction-step-2",
              label: "写真台帳整理",
              prompt: "写真台帳を配筋・型枠・仕上げタグで整理してください。",
            },
            {
              id: "construction-step-3",
              label: "提出要求",
              prompt: "元請提出用に確定して提出してください。",
            },
            {
              id: "construction-step-4",
              label: "提出承認",
              prompt: "提出処理を承認します。",
              approved: true,
            },
          ],
        },
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
      topPanel={
        <DemoScriptPanel
          title="建設: 現場入力から提出承認まで"
          summary="音声メモと写真を起点に、日報生成と提出承認までを1分で体験する。"
          durationSec={60}
          steps={[
            {
              id: "construction-script-1",
              at: "00:00",
              cue: "Input",
              value: "音声入力と写真添付で現場情報を投入",
            },
            {
              id: "construction-script-2",
              at: "00:15",
              cue: "Progress",
              value: "Queue/Planで安全と段取りを可視化",
            },
            {
              id: "construction-script-3",
              at: "00:35",
              cue: "Artifact",
              value: "日報JSONと写真台帳を成果物として提示",
            },
            {
              id: "construction-script-4",
              at: "00:50",
              cue: "Approval",
              value: "提出操作はConfirmationで承認必須",
            },
          ]}
        />
      }
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
