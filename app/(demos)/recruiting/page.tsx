import { DemoScriptPanel } from "@/components/demos/demo-script-panel";
import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { RecruitingSourcePanel } from "@/components/demos/recruiting-source-panel";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  mockCandidateBrief,
  mockRecruitingJobs,
  mockRecruitingWorkflow,
} from "@/lib/mock/recruiting";

export default function RecruitingDemoPage() {
  return (
    <DemoWorkspace
      demo="recruiting"
      title="採用デモ: Recruiting Ops Copilot"
      subtitle="候補者スクリーニング → 面接調整 → オファー承認までを採用業務の実運用に近い形で確認する。"
      suggestions={[
        "候補者サマリを面接官向けに整形して",
        "一次面接の日程調整メッセージを作成",
        "オファー通知の承認フローを開始して",
      ]}
      scenarios={[
        {
          id: "recruiting-fast-lane",
          title: "候補者進行の通しデモ",
          description: "スクリーニングから承認までを短時間で再現。",
          outcome: "採用進行の停滞を削減",
          targetDurationSec: 60,
          steps: [
            {
              id: "recruiting-step-1",
              label: "候補者要約",
              prompt: "候補者の強みと懸念を要約してください。",
            },
            {
              id: "recruiting-step-2",
              label: "面接計画作成",
              prompt: "面接官アサインと確認項目を提案してください。",
            },
            {
              id: "recruiting-step-3",
              label: "オファー要求",
              prompt: "この候補者にオファー通知を送信してください。",
            },
            {
              id: "recruiting-step-4",
              label: "オファー承認",
              prompt: "オファー通知を承認します。",
              approved: true,
            },
          ],
        },
      ]}
      initialQueue={[
        {
          id: "recruiting-queue-1",
          title: "面接調整待ち",
          description: "候補者2名の面接候補日が未確定です。",
          severity: "critical",
          timestamp: new Date().toISOString(),
        },
        {
          id: "recruiting-queue-2",
          title: "評価未提出",
          description: "前回面接の評価入力が1件未完了です。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={mockRecruitingWorkflow.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={[
        { id: "recruiting-task-1", label: "評価フォーム回収", done: false },
        { id: "recruiting-task-2", label: "面接日程の確定", done: false },
        { id: "recruiting-task-3", label: "オファー承認取得", done: false },
      ]}
      initialArtifacts={[
        {
          id: "candidate-brief-initial",
          name: "candidate-brief.json",
          kind: "json",
          content: JSON.stringify(mockCandidateBrief, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "recruiting-market-jobs",
          name: "market-job-signals.json",
          kind: "json",
          content: JSON.stringify(mockRecruitingJobs, null, 2),
          updatedAt: new Date().toISOString(),
        },
      ]}
      topPanel={
        <div className="space-y-4">
          <DemoScriptPanel
            title="採用: 候補者進行と承認"
            summary="採用担当が日々行う情報整理と調整業務をエージェントUIで短縮。"
            durationSec={60}
            steps={[
              {
                id: "recruiting-script-1",
                at: "00:00",
                cue: "Screening",
                value: "候補者情報の要点を抽出して評価観点を整理",
              },
              {
                id: "recruiting-script-2",
                at: "00:20",
                cue: "Coordination",
                value: "面接調整メッセージと進行タスクを生成",
              },
              {
                id: "recruiting-script-3",
                at: "00:40",
                cue: "Evidence",
                value: "採用市況データを参照し、採用優先度を見直し",
              },
              {
                id: "recruiting-script-4",
                at: "00:50",
                cue: "Approval",
                value: "オファー通知はConfirmationで承認",
              },
            ]}
          />
          <RecruitingSourcePanel />
        </div>
      }
      enableVoice
      bottomPanel={
        <WorkflowEditor
          storageKey="workflow:recruiting"
          initialGraph={mockRecruitingWorkflow}
          title="Canvas Workflow: 採用進行オペレーション"
        />
      }
    />
  );
}
