import { DemoWorkspace } from "@/components/demos/demo-workspace";
import { TransportSourcePanel } from "@/components/demos/transport-source-panel";
import { mockAnnouncementDraft, mockOperationEvents } from "@/lib/mock/transport";

export default function TransportDemoPage() {
  return (
    <DemoWorkspace
      demo="transport"
      title="公共交通デモ: Transport Control Desk"
      subtitle="監視(Queue) → 文面生成(Message分岐) → 放送(TTS) → 掲出(WebPreview) を一連で確認する。"
      suggestions={[
        "中央線快速の遅延案内を丁寧文で作成",
        "駅放送向けに30秒以内のスクリプトを作成",
        "掲出UIのHTML案を生成してください",
      ]}
      scenarios={[
        {
          id: "transport-delay-ops",
          title: "遅延発生時の運行デスク対応",
          description: "監視→案内文→公開承認までを再現。",
          outcome: "監視から公表までのオペレーションを標準化",
          targetDurationSec: 45,
          steps: [
            {
              id: "transport-step-1",
              label: "影響要約",
              prompt: "中央線快速の遅延影響を要約してください。",
            },
            {
              id: "transport-step-2",
              label: "案内文生成",
              prompt: "駅掲出文、放送文、CS回答の3種を作成してください。",
            },
            {
              id: "transport-step-3",
              label: "公開要求",
              prompt: "この案内文を公開してください。",
            },
            {
              id: "transport-step-4",
              label: "公開承認",
              prompt: "公開処理を承認します。",
              approved: true,
            },
          ],
        },
      ]}
      initialQueue={mockOperationEvents.map((event, index) => ({
        id: `transport-initial-queue-${index}`,
        title: `${event.line} ${event.status}`,
        description: event.details,
        severity: event.status === "遅延" ? "critical" : "info",
        timestamp: event.updatedAt,
      }))}
      initialPlan={[
        { id: "transport-plan-1", title: "運行情報収集", status: "done" },
        { id: "transport-plan-2", title: "影響推定", status: "doing" },
        { id: "transport-plan-3", title: "案内文生成", status: "todo" },
      ]}
      initialTasks={[
        { id: "transport-task-1", label: "公開前承認の取得", done: false },
        { id: "transport-task-2", label: "放送文読み上げ確認", done: false },
      ]}
      initialArtifacts={[
        {
          id: "transport-announcement-initial",
          name: "announcement.json",
          kind: "json",
          content: JSON.stringify(mockAnnouncementDraft, null, 2),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "transport-preview-html",
          name: "preview.html",
          kind: "html",
          content:
            "<main style='font-family:sans-serif;padding:1rem'><h1>運行情報</h1><p>中央線快速: 最大15分遅延</p><p>振替輸送をご利用ください。</p></main>",
          updatedAt: new Date().toISOString(),
        },
      ]}
      enableVoice
      enableTts
      topPanel={<TransportSourcePanel />}
    />
  );
}
