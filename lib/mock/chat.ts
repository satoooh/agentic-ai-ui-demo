import type {
  ApprovalRequest,
  ArtifactItem,
  CitationItem,
  DemoId,
  PlanStep,
  QueueItem,
  TaskItem,
  ToolEvent,
} from "@/types/chat";
import type { DailyReportDraft } from "@/types/demo";

interface BuildReplyInput {
  demo: DemoId;
  text: string;
  approved?: boolean;
}

export interface MockReply {
  message: string;
  approval: ApprovalRequest;
  queue: QueueItem[];
  plan: PlanStep[];
  tasks: TaskItem[];
  tools: ToolEvent[];
  artifacts: ArtifactItem[];
  citations: CitationItem[];
}

const now = () => new Date().toISOString();

const constructionArtifact: DailyReportDraft = {
  weather: "晴れ",
  workSummary: "躯体2F配筋を完了し、外構側段取りに着手",
  workers: 14,
  machines: ["クレーン 25t"],
  output: "配筋 320m2",
  safetyNotes: ["搬入動線の交差管理を強化"],
  tomorrowPlan: ["配管スリーブ確認", "型枠補修"],
};

function needsApproval(text: string): boolean {
  return ["提出", "公開", "確定", "配布", "送信"].some((keyword) =>
    text.toLowerCase().includes(keyword),
  );
}

function getCommonToolEvents(name: string): ToolEvent[] {
  return [
    {
      id: `tool-${name}-running`,
      name,
      status: "running",
      detail: `${name} を実行中です。`,
      timestamp: now(),
    },
    {
      id: `tool-${name}-done`,
      name,
      status: "success",
      detail: `${name} が完了しました。`,
      timestamp: now(),
    },
  ];
}

export function buildMockReply(input: BuildReplyInput): MockReply {
  const approvalRequired = needsApproval(input.text) && !input.approved;

  if (approvalRequired) {
    return {
      message: "外部反映の操作です。承認後に再送信してください。",
      approval: {
        required: true,
        action: "外部公開",
        reason: "公開操作は確認者による承認が必須です。",
      },
      queue: [],
      plan: [],
      tasks: [],
      tools: [
        {
          id: "tool-approval-blocked",
          name: "confirmation",
          status: "error",
          detail: "承認待ちのため処理を停止しました。",
          timestamp: now(),
        },
      ],
      artifacts: [],
      citations: [],
    };
  }

  if (input.demo === "construction") {
    return {
      message:
        "音声メモと添付写真から日報ドラフト・写真台帳・翌日段取りの下書きを生成しました。",
      approval: {
        required: false,
        action: "",
        reason: "",
      },
      queue: [
        {
          id: "construction-alert-1",
          title: "搬入動線の交差",
          description: "午後の搬入タイミングが重複。誘導員を1名増員推奨。",
          severity: "warning",
          timestamp: now(),
        },
      ],
      plan: [
        { id: "c-plan-1", title: "音声メモの要点抽出", status: "done" },
        { id: "c-plan-2", title: "写真タグ整理", status: "doing" },
        { id: "c-plan-3", title: "日報フォーマット化", status: "todo" },
      ],
      tasks: [
        { id: "c-task-1", label: "出来高の数値確認", done: false },
        { id: "c-task-2", label: "KYメモの追記", done: false },
      ],
      tools: getCommonToolEvents("siteops-pipeline"),
      artifacts: [
        {
          id: "daily-report",
          name: "daily-report.json",
          kind: "json",
          content: JSON.stringify(constructionArtifact, null, 2),
          updatedAt: now(),
        },
      ],
      citations: [],
    };
  }

  if (input.demo === "transport") {
    return {
      message:
        "運行情報をもとに、案内文（丁寧/簡潔/英語併記）と放送文を生成しました。",
      approval: {
        required: false,
        action: "",
        reason: "",
      },
      queue: [
        {
          id: "transport-alert-1",
          title: "中央線快速 遅延",
          description: "信号確認の影響で最大15分遅延。",
          severity: "critical",
          timestamp: now(),
        },
      ],
      plan: [
        { id: "t-plan-1", title: "運行データ取得", status: "done" },
        { id: "t-plan-2", title: "影響範囲要約", status: "done" },
        { id: "t-plan-3", title: "案内文生成", status: "doing" },
      ],
      tasks: [
        { id: "t-task-1", label: "駅表示の最終文言確認", done: false },
        { id: "t-task-2", label: "放送文を読み上げ確認", done: false },
      ],
      tools: getCommonToolEvents("transport-announcer"),
      artifacts: [
        {
          id: "station-announcement",
          name: "station-announcement.md",
          kind: "markdown",
          content:
            "# 駅掲出案\n\n中央線快速は信号確認の影響で遅れが発生しています。振替輸送をご利用ください。",
          updatedAt: now(),
        },
        {
          id: "station-preview",
          name: "display-preview.html",
          kind: "html",
          content:
            "<main><h1>運行情報</h1><p>中央線快速: 最大15分遅延</p><p>振替輸送をご利用ください。</p></main>",
          updatedAt: now(),
        },
      ],
      citations: [],
    };
  }

  return {
    message:
      "e-Gov候補とe-Stat統計をもとに、根拠付きレポートとコネクタ実装案を生成しました。",
    approval: {
      required: false,
      action: "",
      reason: "",
    },
    queue: [
      {
        id: "gov-alert-1",
        title: "取得候補データを確定",
        description: "統計表IDの最終確認が必要です。",
        severity: "info",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "g-plan-1", title: "メタデータ探索", status: "done" },
      { id: "g-plan-2", title: "統計取得", status: "doing" },
      { id: "g-plan-3", title: "レポート生成", status: "todo" },
    ],
    tasks: [
      { id: "g-task-1", label: "引用元URL検証", done: false },
      { id: "g-task-2", label: "定期実行スケジュール設定", done: false },
    ],
    tools: getCommonToolEvents("gov-insight-pipeline"),
    artifacts: [
      {
        id: "gov-report",
        name: "gov-insight-report.md",
        kind: "markdown",
        content:
          "# 根拠付きレポート\n\n- e-Stat と e-Gov の候補を統合し、地域別指標の差分を要約しました。\n- 次のアクション: 指標閾値の定義と定期レポート配布承認。",
        updatedAt: now(),
      },
      {
        id: "connector-code",
        name: "connectors/estat.ts",
        kind: "code",
        content:
          "export async function fetchEstat(appId: string, statsDataId: string) { /* TODO */ }",
        updatedAt: now(),
      },
    ],
    citations: [
      {
        id: "cite-estat",
        title: "e-Stat API",
        url: "https://www.e-stat.go.jp/api/api-dev/how_to_use",
        quote: "API利用にはアプリケーションIDが必要。",
      },
      {
        id: "cite-egov",
        title: "e-Gov メタデータAPI",
        url: "https://data.e-gov.go.jp/data/api_guide",
        quote: "メタデータAPIでデータセット探索が可能。",
      },
    ],
  };
}
