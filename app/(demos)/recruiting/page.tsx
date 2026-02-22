import { AgenticHighlightsPanel } from "@/components/demos/agentic-highlights-panel";
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
      title="採用デモ: Recruiting Agentic Loop"
      subtitle="要件入力 → 候補者要約 → 面接設計 → 懸念シミュレーション → 次探索生成までを、採用の自律ループとして実演する。"
      suggestions={[
        "候補者サマリを面接官向けに整形して",
        "一次面接の日程調整メッセージを作成",
        "見送りリスクを下げる追加探索条件を提案して",
        "評価の偏りを減らす質問セットを作成して",
        "ここまでの議論で悪魔の代弁者レビューを実行して",
      ]}
      scenarios={[
        {
          id: "recruiting-agentic-loop",
          title: "採用自律ループ",
          description: "候補者分析→面接設計→懸念検証→次探索までを短時間で再現。",
          outcome: "採用進行の停滞を削減",
          targetDurationSec: 70,
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
              label: "懸念シミュレーション",
              prompt: "採用後ミスマッチになり得る観点を3つ挙げ、面接質問に反映してください。",
            },
            {
              id: "recruiting-step-4",
              label: "次探索生成",
              prompt: "次に探索すべき候補者条件と検索クエリを3つ生成してください。",
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
          title: "評価基準のズレ",
          description: "面接官間で評価観点が揃っていません。質問セットを更新してください。",
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
        { id: "recruiting-task-3", label: "懸念点への質問追加", done: false },
        { id: "recruiting-task-4", label: "次探索クエリ生成", done: false },
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
            title="採用: 自律スクリーニングループ"
            summary="候補者評価を1回で終わらせず、懸念検証と次探索を反復する。"
            durationSec={70}
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
                cue: "Challenge",
                value: "採用ミスマッチの懸念をシミュレーション",
              },
              {
                id: "recruiting-script-4",
                at: "00:56",
                cue: "Iterate",
                value: "次に探索すべき候補者条件を生成",
              },
            ]}
          />
          <AgenticHighlightsPanel
            title="Recruiting Loop Highlights"
            badge="candidate iteration"
            summary="採用は候補者評価で終わらせず、懸念シミュレーションと再探索を自動で回します。"
            steps={[
              {
                id: "recruit-loop-1",
                label: "候補者情報を要約し評価観点を揃える",
                description: "強み/懸念を同じ枠組みで整理",
                status: "complete",
                tags: ["candidate brief", "skills", "concerns"],
              },
              {
                id: "recruit-loop-2",
                label: "面接質問を生成し懸念を検証",
                description: "ミスマッチ要因を面接前に可視化",
                status: "active",
                tags: ["interview plan", "risk check", "question set"],
              },
              {
                id: "recruit-loop-3",
                label: "次探索条件を生成して再検索",
                description: "不足スキルを埋める条件で探索を継続",
                status: "pending",
                tags: ["next candidate query", "market signal", "pipeline update"],
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
          title="Canvas Workflow: 採用反復オペレーション"
        />
      }
    />
  );
}
