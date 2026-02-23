import { DemoWorkspace } from "@/components/demos/demo-workspace";

export default function MeetingDemoPage() {
  return (
    <DemoWorkspace
      demo="meeting"
      title="会議レビューAI"
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
      initialArtifacts={[]}
      enableVoice
    />
  );
}
