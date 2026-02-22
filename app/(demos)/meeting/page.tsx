import { AgenticHighlightsPanel } from "@/components/demos/agentic-highlights-panel";
import { DemoScriptPanel } from "@/components/demos/demo-script-panel";
import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { MeetingSourcePanel } from "@/components/demos/meeting-source-panel";
import { WorkflowEditor } from "@/components/demos/workflow-editor";
import {
  sampleMeetingReview,
  sampleMeetingSignals,
  meetingTranscriptSamples,
  sampleMeetingTranscript,
  sampleMeetingWorkflow,
} from "@/lib/samples/meeting";

export default function MeetingDemoPage() {
  return (
    <DemoWorkspace
      demo="meeting"
      title="会議レビュー: Devil's Advocate Copilot"
      subtitle="会議タイプを設定し、議事録入力 → 前提抽出 → 悪魔の代弁者レビュー → 次アクション確定までを1画面で回す。"
      suggestions={[]}
      initialQueue={[
        {
          id: "meeting-queue-1",
          title: "保留事項が曖昧",
          description: "担当と期限が未定のまま残っている論点があります。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
        {
          id: "meeting-queue-2",
          title: "反証レビュー未実行",
          description: "意思決定の前提に対する逆張り検証を実行してください。",
          severity: "critical",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={sampleMeetingWorkflow.nodes.map((node) => ({
        id: node.id,
        title: node.label,
        status: node.status,
      }))}
      initialTasks={sampleMeetingReview.nextActions.map((action, index) => ({
        id: `meeting-task-${index}`,
        label: action,
        done: false,
      }))}
      initialArtifacts={[
        {
          id: "meeting-transcript-initial",
          name: "meeting-transcript.md",
          kind: "markdown",
          content:
            `# ${sampleMeetingTranscript.title}\n\n` +
            `- 参加者: ${sampleMeetingTranscript.participants.join(", ")}\n` +
            `- 抜粋: ${sampleMeetingTranscript.excerpt}\n`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-review-initial",
          name: "meeting-review.json",
          kind: "json",
          content: JSON.stringify(sampleMeetingReview, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-signals-initial",
          name: "meeting-signals.json",
          kind: "json",
          content: JSON.stringify(sampleMeetingSignals, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "meeting-transcript-samples",
          name: "meeting-transcript-samples.md",
          kind: "markdown",
          content:
            "# サンプル発言録（ダミー）\n\n" +
            meetingTranscriptSamples
              .map(
                (sample, index) =>
                  `## ${index + 1}. ${sample.title}\n` +
                  `- 会議タイプ: ${sample.meetingProfileId}\n` +
                  `- メモ: ${sample.note}\n` +
                  `- 冒頭抜粋: ${sample.dirtyTranscript.split("\n")[0]}`,
              )
              .join("\n\n"),
          updatedAt: new Date().toISOString(),
        },
      ]}
      topPanel={
        <div className="space-y-4">
          <DemoScriptPanel
            title="会議レビュー: 反証主導ループ"
            summary="議事録から前提を抽出し、悪魔の代弁者で意思決定の弱点を可視化する。"
            durationSec={60}
            steps={[
              {
                id: "meeting-script-1",
                at: "00:00",
                cue: "Input",
                value: "会議ログを貼り付けて要点を抽出",
              },
              {
                id: "meeting-script-2",
                at: "00:18",
                cue: "Assumption",
                value: "判断前提を構造化し、検証不足を特定",
              },
              {
                id: "meeting-script-3",
                at: "00:32",
                cue: "Challenge",
                value: "悪魔の代弁者で反証シナリオを生成",
              },
              {
                id: "meeting-script-4",
                at: "00:48",
                cue: "Act",
                value: "次回会議までのタスクと検証クエリを確定",
              },
            ]}
          />
          <AgenticHighlightsPanel
            title="Meeting Loop Highlights"
            badge="decision quality"
            summary="会議の結論をそのまま実行せず、反証を挟んで意思決定品質を上げるフローです。"
            steps={[
              {
                id: "meeting-loop-1",
                label: "議事録から決定事項と保留事項を抽出",
                description: "実行対象と未確定項目を明確に分離",
                status: "complete",
                tags: ["minutes", "decision", "pending items"],
              },
              {
                id: "meeting-loop-2",
                label: "悪魔の代弁者で前提を反証",
                description: "失敗シナリオを先に出して意思決定を修正",
                status: "active",
                tags: ["counter argument", "failure scenario", "blind spot"],
              },
              {
                id: "meeting-loop-3",
                label: "次回までの検証タスクを自動生成",
                description: "担当・期限・根拠データ取得まで定義",
                status: "pending",
                tags: ["action plan", "owner", "deadline"],
              },
            ]}
          />
          <MeetingSourcePanel />
        </div>
      }
      enableVoice
      bottomPanel={
        <WorkflowEditor
          storageKey="workflow:meeting"
          initialGraph={sampleMeetingWorkflow}
          title="Canvas Workflow: 会議レビュー反復オペレーション"
        />
      }
    />
  );
}
