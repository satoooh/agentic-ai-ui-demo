import { AgenticHighlightsPanel } from "@/components/demos/agentic-highlights-panel";
import { DemoScriptPanel } from "@/components/demos/demo-script-panel";
import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { SalesSourcePanel } from "@/components/demos/sales-source-panel";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  sampleSalesAccountInsight,
  sampleSalesOutreachDraft,
  sampleSalesWorkflow,
} from "@/lib/samples/sales";

export default function SalesDemoPage() {
  return (
    <DemoWorkspace
      demo="sales"
      title="営業デモ: Sales Agentic Loop"
      subtitle="目的入力 → アカウント収集 → 提案生成 → 反証探索 → 次アクション生成までを、営業の自律ループとして実演する。"
      suggestions={[
        "この顧客向けの提案骨子を3点で整理して",
        "初回商談用のメール案を作成して",
        "競合比較に進むための追加探索クエリを3つ出して",
        "この提案への反論シミュレーションを作成して",
        "ここまでの内容で悪魔の代弁者レビューを実行して",
      ]}
      scenarios={[
        {
          id: "sales-agentic-loop",
          title: "営業自律ループ",
          description: "情報収集→提案生成→反証→次アクションまでを1分で再現。",
          outcome: "提案作成の初稿時間と検討ループを短縮",
          targetDurationSec: 65,
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
              label: "反証探索",
              prompt: "この提案が刺さらない可能性を3つ挙げ、修正案を作成してください。",
            },
            {
              id: "sales-step-4",
              label: "次アクション生成",
              prompt: "次回商談までの実行タスクと追加探索クエリを生成してください。",
            },
          ],
        },
      ]}
      initialQueue={[
        {
          id: "sales-initial-queue-1",
          title: "反証探索が未実行",
          description: "提案の弱点検証を回すと精度が上がります。",
          severity: "info",
          timestamp: new Date().toISOString(),
        },
        {
          id: "sales-initial-queue-2",
          title: "競合比較候補",
          description: "次ループで競合企業の公開情報を並列取得してください。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={sampleSalesWorkflow.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={sampleSalesOutreachDraft.followUpTasks.map((task, index) => ({
        id: `sales-task-${index}`,
        label: task,
        done: false,
      }))}
      initialArtifacts={[
        {
          id: "sales-account-initial",
          name: "account-brief.json",
          kind: "json",
          content: JSON.stringify(sampleSalesAccountInsight, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "sales-outreach-initial",
          name: "outreach-plan.json",
          kind: "json",
          content: JSON.stringify(sampleSalesOutreachDraft, null, 2),
          updatedAt: new Date().toISOString(),
        },
      ]}
      topPanel={
        <div className="space-y-4">
          <DemoScriptPanel
            title="営業: 自律提案ループ"
            summary="収集→提案→反証→次アクションを1サイクルで回し、Agentic UIの価値を示す。"
            durationSec={65}
            steps={[
              {
                id: "sales-script-1",
                at: "00:00",
                cue: "Goal",
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
                cue: "Challenge",
                value: "反証シミュレーションで提案の弱点を可視化",
              },
              {
                id: "sales-script-4",
                at: "00:54",
                cue: "Iterate",
                value: "次ループの探索クエリと実行タスクを自動生成",
              },
            ]}
          />
          <AgenticHighlightsPanel
            title="Sales Loop Highlights"
            badge="proposal iteration"
            summary="営業は初稿作成で終わらせず、反証探索を回して次アクションを自動生成します。"
            steps={[
              {
                id: "sales-loop-1",
                label: "アカウント情報を収集し提案仮説を生成",
                description: "公開シグナルを基に、課題仮説と価値訴求を初期化",
                status: "complete",
                tags: ["account signal", "pain points", "draft value"],
              },
              {
                id: "sales-loop-2",
                label: "反証シミュレーションで弱点を洗い出す",
                description: "刺さらない理由を先に出し、提案を改訂",
                status: "active",
                tags: ["objection", "risk", "counter proposal"],
              },
              {
                id: "sales-loop-3",
                label: "次ループの探索クエリを生成",
                description: "競合比較や追加証拠の取得にそのまま使う",
                status: "pending",
                tags: ["next query", "competitor", "proof points"],
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
          initialGraph={sampleSalesWorkflow}
          title="Canvas Workflow: 提案反復オペレーション"
        />
      }
    />
  );
}
