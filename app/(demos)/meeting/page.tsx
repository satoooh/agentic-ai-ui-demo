import { DemoWorkspace } from "@/components/demos/demo-workspace";
import {
  sampleMeetingReview,
  meetingTranscriptSamples,
  sampleMeetingTranscript,
} from "@/lib/samples/meeting";

export default function MeetingDemoPage() {
  return (
    <DemoWorkspace
      demo="meeting"
      title="会議レビュー: 倍速会議 Copilot"
      subtitle="議事録入力を起点に、合意形成を速めるための要約・反証レビュー・次アクション化をチャットで反復する。"
      suggestions={[]}
      initialQueue={[
        {
          id: "meeting-queue-priority",
          title: "議事録入力を先に完了",
          description: "Step 1 で議事録を確定すると、以降の推論品質が安定します。",
          severity: "warning",
          timestamp: new Date().toISOString(),
        },
      ]}
      initialPlan={[]}
      initialTasks={[]}
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
      enableVoice
    />
  );
}
