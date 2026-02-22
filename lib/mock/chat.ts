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
import { mockCandidateBrief, mockRecruitingJobs } from "@/lib/mock/recruiting";
import { mockResearchConnectorProject, mockResearchEvidence, mockResearchSignals } from "@/lib/mock/research";
import { mockSalesAccountInsight, mockSalesOutreachDraft } from "@/lib/mock/sales";

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

function resolveApprovalAction(text: string): string | null {
  if (text.includes("送信") || text.includes("提案送付")) {
    return "営業提案の外部送付";
  }
  if (text.includes("オファー") || text.includes("内定")) {
    return "オファー通知";
  }
  if (text.includes("配布") || text.includes("共有")) {
    return "リサーチレポート配布";
  }
  if (text.includes("公開")) {
    return "外部公開";
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

function buildSalesReply(text: string): MockReply {
  const objective = text.includes("採用") ? "採用業務の効率化提案" : mockSalesOutreachDraft.objective;

  const draft = {
    ...mockSalesOutreachDraft,
    objective,
  };

  return {
    message: "営業向けのアカウント調査結果を反映し、提案骨子と次アクションを更新しました。",
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "sales-alert-1",
        title: "提案送付前レビュー",
        description: "顧客業界向けの導入効果数値を追記すると成約率改善が見込めます。",
        severity: "warning",
        timestamp: now(),
      },
      {
        id: "sales-alert-2",
        title: "次回MTG調整",
        description: "決裁者同席の30分枠を提案してください。",
        severity: "info",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "s-plan-1", title: "アカウント情報収集", status: "done" },
      { id: "s-plan-2", title: "提案骨子作成", status: "doing" },
      { id: "s-plan-3", title: "送付承認", status: "todo" },
    ],
    tasks: [
      { id: "s-task-1", label: "顧客課題の優先度確認", done: false },
      { id: "s-task-2", label: "提案資料の数値根拠追記", done: false },
      { id: "s-task-3", label: "送付承認の取得", done: false },
    ],
    tools: getCommonToolEvents("sales-playbook-agent"),
    artifacts: [
      {
        id: "sales-outreach",
        name: "outreach-plan.json",
        kind: "json",
        content: JSON.stringify(draft, null, 2),
        updatedAt: now(),
      },
      {
        id: "sales-account-brief",
        name: "account-brief.json",
        kind: "json",
        content: JSON.stringify(mockSalesAccountInsight, null, 2),
        updatedAt: now(),
      },
      {
        id: "sales-mail-draft",
        name: "mail-draft.md",
        kind: "markdown",
        content:
          "# 提案メール案\n\n" +
          `対象: ${mockSalesAccountInsight.displayName}\n\n` +
          "先日のヒアリング内容をもとに、開発生産性と採用効率を同時に改善する導入プランを整理しました。`Run Scenario` 後、差分を追記して送付承認へ進んでください。",
        updatedAt: now(),
      },
    ],
    citations: [
      {
        id: "salesforce-state-of-sales",
        title: "State of Sales 7th edition",
        url: "https://www.salesforce.com/ap/resources/state-of-sales/",
        quote: "営業担当者が販売活動以外に時間を使う構造を改善する必要がある。",
      },
    ],
  };
}

function buildRecruitingReply(text: string): MockReply {
  const recommendation: typeof mockCandidateBrief.recommendation = text.includes("強く")
    ? "strong_yes"
    : mockCandidateBrief.recommendation;

  return {
    message: "採用オペレーション向けに候補者サマリ、面接計画、通知文面を更新しました。",
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "recruiting-alert-1",
        title: "面接調整遅延",
        description: "一次面接の候補日が不足しています。48時間以内に候補提示が必要です。",
        severity: "critical",
        timestamp: now(),
      },
      {
        id: "recruiting-alert-2",
        title: "評価未提出",
        description: "2名の面接官が評価フォーム未提出です。",
        severity: "warning",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "r-plan-1", title: "候補者情報整理", status: "done" },
      { id: "r-plan-2", title: "面接官アサイン", status: "doing" },
      { id: "r-plan-3", title: "オファー承認", status: "todo" },
    ],
    tasks: [
      { id: "r-task-1", label: "候補者評価の回収", done: false },
      { id: "r-task-2", label: "次面接日程の確定", done: false },
      { id: "r-task-3", label: "オファー条件の承認", done: false },
    ],
    tools: getCommonToolEvents("recruiting-ops-agent"),
    artifacts: [
      {
        id: "candidate-brief",
        name: "candidate-brief.json",
        kind: "json",
        content: JSON.stringify({ ...mockCandidateBrief, recommendation }, null, 2),
        updatedAt: now(),
      },
      {
        id: "recruiting-pipeline",
        name: "market-job-signals.json",
        kind: "json",
        content: JSON.stringify(mockRecruitingJobs, null, 2),
        updatedAt: now(),
      },
      {
        id: "interview-plan",
        name: "interview-plan.md",
        kind: "markdown",
        content:
          "# 面接計画\n\n" +
          "- Panel A: 技術深掘り（45分）\n" +
          "- Panel B: チームフィット（30分）\n" +
          "- Hiring Manager: 最終判断（30分）\n\n" +
          `補足: ${text.trim() || "採用要件に合わせて質問項目を調整してください。"}`,
        updatedAt: now(),
      },
    ],
    citations: [
      {
        id: "linkedin-future-recruiting",
        title: "LinkedIn Future of Recruiting",
        url: "https://business.linkedin.com/talent-solutions/future-of-recruiting",
        quote: "採用は事業成果に紐づく戦略機能として扱う重要性が高まっている。",
      },
    ],
  };
}

function buildResearchReply(text: string): MockReply {
  const normalized = text.toLowerCase();
  const targetCompany = normalized.includes("sony")
    ? "SONY"
    : normalized.includes("toyota") || text.includes("トヨタ")
      ? "TOYOTA"
      : "MICROSOFT";

  const signals = mockResearchSignals.map((signal) =>
    signal.kind === "ir_filing"
      ? {
          ...signal,
          title: `${targetCompany}: ${signal.title}`,
        }
      : signal,
  );

  return {
    message:
      "企業IRと公開情報を収集し、根拠付きブリーフ・提出書類一覧・次探索クエリ案を更新しました。",
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "research-alert-1",
        title: "提出書類リンク確認",
        description: "配布前にIR提出書類のリンク有効性と提出日を再確認してください。",
        severity: "warning",
        timestamp: now(),
      },
      {
        id: "research-alert-2",
        title: "企業同名の誤判定注意",
        description: "社名だけでなくティッカー/証券コードで再検索してください。",
        severity: "info",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "q-plan-1", title: "対象企業の識別", status: "done" },
      { id: "q-plan-2", title: "IR提出書類の収集", status: "done" },
      { id: "q-plan-3", title: "公開ニュース要約", status: "doing" },
      { id: "q-plan-4", title: "次探索クエリ生成", status: "todo" },
    ],
    tasks: [
      { id: "q-task-1", label: "IR根拠リンクの確認", done: false },
      { id: "q-task-2", label: "公開情報との整合確認", done: false },
      { id: "q-task-3", label: "懸念点の優先度付け", done: false },
      { id: "q-task-4", label: "次探索クエリの設計", done: false },
    ],
    tools: getCommonToolEvents("research-brief-agent"),
    artifacts: [
      {
        id: "research-brief",
        name: "company-ir-brief.md",
        kind: "markdown",
        content:
          `# Company IR Brief: ${targetCompany}\n\n` +
          "- 収集対象: SEC / GDELT / Wikidata\n" +
          "- 主要示唆: 財務開示の直近変化と外部報道の論点を接続\n" +
          "- 次アクション: 競合比較・リスク監視・商談仮説へ展開",
        updatedAt: now(),
      },
      {
        id: "research-signals",
        name: "ir-public-signals.json",
        kind: "json",
        content: JSON.stringify(signals, null, 2),
        updatedAt: now(),
      },
      {
        id: "connector-project",
        name: "connector-project.json",
        kind: "json",
        content: JSON.stringify(mockResearchConnectorProject, null, 2),
        updatedAt: now(),
      },
      {
        id: "risk-register",
        name: "risk-register.md",
        kind: "markdown",
        content:
          "# Risk Register\n\n" +
          "1. 開示遅延: 最新提出書類の取得遅延に注意\n" +
          "2. 情報鮮度: ニュース速報とIR確定情報を分離して解釈\n" +
          "3. 同名企業: 識別子（ticker/secCode）で照合",
        updatedAt: now(),
      },
      {
        id: "next-queries",
        name: "next-queries.md",
        kind: "markdown",
        content:
          "# Next Query Proposals\n\n" +
          "- Compare with GOOGL: `Google AI capital allocation 10-K 10-Q risk opportunity`\n" +
          "- Compare with AMZN: `Amazon generative AI investment filing signal`\n" +
          "- Regional: `Japan listed AI investment disclosure trend 2025 2026`",
        updatedAt: now(),
      },
    ],
    citations: mockResearchEvidence.map((evidence, index) => ({
      id: `research-citation-${index}`,
      title: evidence.sourceTitle,
      url: evidence.url,
      quote: evidence.quote,
    })),
  };
}

export function buildMockReply(input: BuildReplyInput): MockReply {
  const action = resolveApprovalAction(input.text);
  if (action && !input.approved) {
    return buildApprovalReply(action);
  }

  if (input.demo === "sales") {
    return buildSalesReply(input.text);
  }
  if (input.demo === "recruiting") {
    return buildRecruitingReply(input.text);
  }
  return buildResearchReply(input.text);
}
