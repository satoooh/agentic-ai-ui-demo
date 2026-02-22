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
import type { DailyReportDraft, PhotoLedgerItem } from "@/types/demo";
import { mockDatasetCandidates, mockEvidence, mockStatSeries } from "@/lib/mock/gov";

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

const transportLineCandidates = [
  "中央線快速",
  "山手線",
  "京浜東北線",
  "総武線",
  "東海道線",
  "京王線",
  "小田急線",
];

const govThemes = [
  "人口",
  "観光",
  "雇用",
  "住宅",
  "医療",
  "教育",
  "災害",
  "交通",
];

function extractNumber(text: string, pattern: RegExp, fallback: number): number {
  const matched = pattern.exec(text);
  if (!matched?.[1]) {
    return fallback;
  }

  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveApprovalAction(text: string): string | null {
  if (text.includes("提出")) {
    return "元請提出";
  }

  if (text.includes("公開")) {
    return "運行案内公開";
  }

  if (text.includes("配布")) {
    return "レポート配布";
  }

  if (text.includes("送信")) {
    return "外部送信";
  }

  if (text.includes("確定")) {
    return "最終確定";
  }

  return null;
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

function buildConstructionArtifacts(text: string): {
  report: DailyReportDraft;
  photoLedger: PhotoLedgerItem[];
  tags: string[];
} {
  const weather = text.includes("雨")
    ? "雨"
    : text.includes("曇")
      ? "曇り"
      : text.includes("雪")
        ? "雪"
        : "晴れ";
  const workers = extractNumber(text, /(\d{1,3})\s*(?:名|人)/, 14);
  const outputSquare = extractNumber(text, /(\d{2,4})\s*(?:m2|㎡|m²)/i, 320);
  const location = text.includes("西側")
    ? "西側"
    : text.includes("南側")
      ? "南側"
      : text.includes("北側")
        ? "北側"
        : "東側";

  const tags = ["配筋", "型枠", "コンクリート", "仕上げ", "配管"].filter((tag) =>
    text.includes(tag),
  );
  const resolvedTags = tags.length > 0 ? tags : ["配筋", "型枠"];
  const safetyNotes = [
    text.includes("高所") ? "高所作業帯の親綱チェックを優先" : null,
    text.includes("交差") ? "搬入動線の交差タイミングを分離" : null,
    text.includes("重機") ? "重機周辺の立入区画を再設定" : null,
  ].filter((item): item is string => Boolean(item));

  const report: DailyReportDraft = {
    weather,
    workSummary:
      text.trim().length > 0
        ? `${text.trim().replace(/\s+/g, " ").slice(0, 70)}`
        : "躯体工事の主要工程を進行し、翌日段取りを更新。",
    workers,
    machines: text.includes("ポンプ車")
      ? ["ポンプ車", "クレーン 25t"]
      : ["クレーン 25t", "高所作業車"],
    output: `${resolvedTags[0]} ${outputSquare}m2`,
    safetyNotes: safetyNotes.length > 0 ? safetyNotes : ["搬入動線と作業帯の分離を徹底"],
    tomorrowPlan: [
      `${resolvedTags[0]}の残作業確認`,
      "KYミーティングで重点リスク共有",
      "提出前チェックリストの完了確認",
    ],
  };

  const photoLedger: PhotoLedgerItem[] = resolvedTags.map((tag, index) => ({
    fileId: `img-${String(index + 1).padStart(3, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    section: "A工区",
    processTag: tag,
    locationTag: `2F${location}`,
    caption: `${tag}工程の記録写真`,
  }));

  return { report, photoLedger, tags: resolvedTags };
}

function buildConstructionReply(text: string): MockReply {
  const { report, photoLedger, tags } = buildConstructionArtifacts(text);

  return {
    message: `現場入力を反映し、天候:${report.weather} / 人員:${report.workers}名 / 工程:${tags.join("・")} で日報と台帳を更新しました。`,
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "construction-alert-1",
        title: text.includes("高所") ? "高所作業リスク" : "搬入動線の交差",
        description: text.includes("高所")
          ? "午後工程で高所作業が発生。墜落防止設備の再点検を推奨。"
          : "午後搬入が重なるため誘導員配置を推奨。",
        severity: text.includes("事故") ? "critical" : "warning",
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
      { id: "c-task-2", label: "安全メモの追記", done: false },
      { id: "c-task-3", label: "提出前の承認依頼", done: false },
    ],
    tools: getCommonToolEvents("siteops-pipeline"),
    artifacts: [
      {
        id: "daily-report",
        name: "daily-report.json",
        kind: "json",
        content: JSON.stringify(report, null, 2),
        updatedAt: now(),
      },
      {
        id: "photo-ledger",
        name: "photo-ledger.json",
        kind: "json",
        content: JSON.stringify(photoLedger, null, 2),
        updatedAt: now(),
      },
    ],
    citations: [],
  };
}

function resolveTransportLine(text: string): string {
  const found = transportLineCandidates.find((line) => text.includes(line));
  return found ?? "中央線快速";
}

function buildTransportReply(text: string): MockReply {
  const line = resolveTransportLine(text);
  const status = text.includes("運休")
    ? "運休"
    : text.includes("平常")
      ? "平常"
      : "遅延";
  const delayMinutes = status === "平常" ? 0 : extractNumber(text, /(\d{1,3})\s*分/, 15);
  const reason = text.includes("人身")
    ? "人身事故"
    : text.includes("車両")
      ? "車両点検"
      : text.includes("架線")
        ? "架線点検"
        : "信号確認";

  const description =
    status === "平常"
      ? `${line}は平常運転です。`
      : `${reason}の影響で${line}に最大${delayMinutes}分の${status}。`;
  const webText =
    status === "平常"
      ? `${line}は現在平常運転です。`
      : `${line}は${reason}の影響で${delayMinutes}分程度の遅れが発生しています。`;

  return {
    message: `${line}の運行ステータスを反映し、掲出文・放送文・CS回答を更新しました。`,
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "transport-alert-1",
        title: `${line} ${status}`,
        description,
        severity: status === "平常" ? "info" : "critical",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "t-plan-1", title: "運行データ取得", status: "done" },
      { id: "t-plan-2", title: "影響範囲要約", status: "done" },
      {
        id: "t-plan-3",
        title: "案内文生成",
        status: text.includes("公開") ? "done" : "doing",
      },
    ],
    tasks: [
      { id: "t-task-1", label: "駅表示の最終文言確認", done: false },
      { id: "t-task-2", label: "放送文読み上げ確認", done: false },
      { id: "t-task-3", label: "公開承認フロー実施", done: false },
    ],
    tools: getCommonToolEvents("transport-announcer"),
    artifacts: [
      {
        id: "station-announcement",
        name: "station-announcement.md",
        kind: "markdown",
        content: `# 駅掲出案\n\n${webText}\n\n- 影響: ${status}${status === "平常" ? "" : `（最大${delayMinutes}分）`}\n- 振替輸送: ${status === "平常" ? "不要" : "利用案内を表示"}`,
        updatedAt: now(),
      },
      {
        id: "station-preview",
        name: "display-preview.html",
        kind: "html",
        content: `<main style="font-family:sans-serif;padding:1rem"><h1>運行情報</h1><p>${line}: ${status}${status === "平常" ? "" : ` / 最大${delayMinutes}分`}</p><p>${webText}</p></main>`,
        updatedAt: now(),
      },
    ],
    citations: [],
  };
}

function resolveGovTheme(text: string): string {
  const found = govThemes.find((theme) => text.includes(theme));
  return found ?? "人口";
}

function buildGovReply(text: string): MockReply {
  const theme = resolveGovTheme(text);
  const selectedCandidates = mockDatasetCandidates.map((candidate, index) => ({
    ...candidate,
    title: index === 0 ? `${theme}関連: ${candidate.title}` : candidate.title,
  }));
  const topStat = mockStatSeries.data[0];

  return {
    message: `${theme}テーマでデータ候補を再整理し、根拠付きサマリとコネクタ草案を更新しました。`,
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "gov-alert-1",
        title: `${theme}データ候補の確定`,
        description: "統計表IDと指標定義の確定が必要です。",
        severity: "info",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "g-plan-1", title: "テーマ分解", status: "done" },
      { id: "g-plan-2", title: "メタデータ探索", status: "doing" },
      { id: "g-plan-3", title: "根拠付きレポート生成", status: "todo" },
    ],
    tasks: [
      { id: "g-task-1", label: "引用元URL検証", done: false },
      { id: "g-task-2", label: "KPI定義レビュー", done: false },
      { id: "g-task-3", label: "配布承認の実施", done: false },
    ],
    tools: getCommonToolEvents("gov-insight-pipeline"),
    artifacts: [
      {
        id: "gov-report",
        name: "gov-insight-report.md",
        kind: "markdown",
        content: `# ${theme} 根拠付きレポート\n\n- 主要系列: ${mockStatSeries.statsDataId}\n- 観測値例: ${topStat.label} = ${topStat.value.toLocaleString()}\n- 次アクション: 配布前承認と閾値定義の確定`,
        updatedAt: now(),
      },
      {
        id: "connector-code",
        name: `connectors/${theme}-connector.ts`,
        kind: "code",
        content:
          `export async function fetch${theme}Series(appId: string) {\n` +
          "  // TODO: call e-Stat / e-Gov APIs\n" +
          `  return { appId, statsDataId: "${mockStatSeries.statsDataId}" };\n` +
          "}\n",
        updatedAt: now(),
      },
      {
        id: "dataset-candidates",
        name: "dataset-candidates.json",
        kind: "json",
        content: JSON.stringify(selectedCandidates, null, 2),
        updatedAt: now(),
      },
    ],
    citations: [
      ...mockEvidence.map((evidence, index) => ({
        id: `cite-${index}`,
        title: evidence.sourceTitle,
        url: evidence.url,
        quote: evidence.quote,
      })),
      {
        id: "cite-estat-howto",
        title: "e-Stat API利用方法",
        url: "https://www.e-stat.go.jp/api/api-dev/how_to_use",
        quote: "API利用にはアプリケーションIDが必要。",
      },
    ],
  };
}

function buildApprovalReply(action: string): MockReply {
  return {
    message: `${action}は承認待ちです。Confirmationで承認後に再送信してください。`,
    approval: {
      required: true,
      action,
      reason: `${action}は外部反映を伴うため、確認者の承認が必要です。`,
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

export function buildMockReply(input: BuildReplyInput): MockReply {
  const action = resolveApprovalAction(input.text);
  if (action && !input.approved) {
    return buildApprovalReply(action);
  }

  if (input.demo === "construction") {
    return buildConstructionReply(input.text);
  }

  if (input.demo === "transport") {
    return buildTransportReply(input.text);
  }

  return buildGovReply(input.text);
}
