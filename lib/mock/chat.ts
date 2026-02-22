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
import { mockMeetingReview, mockMeetingTranscript } from "@/lib/mock/meeting";
import { mockResearchConnectorProject, mockResearchEvidence, mockResearchSignals } from "@/lib/mock/research";
import { mockSalesAccountInsight, mockSalesOutreachDraft } from "@/lib/mock/sales";

interface BuildReplyInput {
  demo: DemoId;
  text: string;
  approved?: boolean;
}

interface MeetingTemplate {
  label: string;
  queue: Array<Pick<QueueItem, "title" | "description" | "severity">>;
  assumptions: string[];
  counterArguments: string[];
  actions: Array<{ task: string; owner: string; due: string; metric: string }>;
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

const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    label: "営業週次",
    queue: [
      {
        title: "失注リスクの裏取り不足",
        description: "感覚的判断が多く、案件別の根拠データが不足しています。",
        severity: "critical",
      },
      {
        title: "次回打ち手の優先順位未定",
        description: "案件ごとの優先順位が曖昧です。",
        severity: "warning",
      },
    ],
    assumptions: [
      "既存顧客への追加提案は現場負荷を増やさない",
      "商談停滞の主因は提案内容であり実行速度ではない",
      "四半期内の予算確保は現状維持で進む",
    ],
    counterArguments: [
      "提案追加はCS対応を増やし、短期的に現場負荷を悪化させる可能性がある",
      "停滞原因は提案内容ではなく意思決定者への接触不足かもしれない",
      "競合の価格変更で前提ROIが崩れる可能性がある",
    ],
    actions: [
      { task: "優先案件トップ3の失注シナリオ再評価", owner: "AE", due: "今週金曜", metric: "失注リスク更新率" },
      { task: "提案修正案のA/B比較", owner: "Sales Ops", due: "来週火曜", metric: "商談化率" },
      { task: "競合価格変動の週次監視", owner: "RevOps", due: "毎週月曜", metric: "価格差アラート件数" },
    ],
  },
  {
    label: "採用進捗",
    queue: [
      {
        title: "面接歩留まり低下",
        description: "書類通過後の面接辞退率が高い状態です。",
        severity: "critical",
      },
      {
        title: "評価基準の不一致",
        description: "面接官ごとに採用判断基準が異なっています。",
        severity: "warning",
      },
    ],
    assumptions: [
      "候補者不足が採用停滞の主因である",
      "面接回数は現状のままで妥当",
      "オファー条件は市場競争力がある",
    ],
    counterArguments: [
      "候補者不足ではなく面接体験の悪化が辞退の主因かもしれない",
      "面接回数の多さが離脱要因になっている可能性がある",
      "競合と比較して提示条件が弱い可能性がある",
    ],
    actions: [
      { task: "歩留まりを選考段階別に再計測", owner: "Recruiter", due: "今週木曜", metric: "段階別CVR" },
      { task: "面接質問セットの統一", owner: "Hiring Manager", due: "来週月曜", metric: "評価軸一致率" },
      { task: "辞退理由の定量集計", owner: "People Ops", due: "来週水曜", metric: "辞退理由分類率" },
    ],
  },
  {
    label: "プロダクト計画",
    queue: [
      {
        title: "依存関係の見落とし",
        description: "優先機能の前提実装が抜けています。",
        severity: "critical",
      },
      {
        title: "スコープ肥大化",
        description: "次スプリントの作業量が過大です。",
        severity: "warning",
      },
    ],
    assumptions: [
      "主要機能は想定工数で完了できる",
      "外部API変更は発生しない",
      "優先度高の要件は仕様変更しない",
    ],
    counterArguments: [
      "外部依存の遅延でスケジュールが崩れる可能性がある",
      "仕様変更が生じると優先機能の着地が難しい",
      "QA負荷が想定より大きくなる可能性がある",
    ],
    actions: [
      { task: "依存関係マップの更新", owner: "PM", due: "今週金曜", metric: "依存漏れ件数" },
      { task: "スプリントスコープ再調整", owner: "Tech Lead", due: "来週月曜", metric: "見積もり超過率" },
      { task: "仕様変更リスクの事前整理", owner: "Designer", due: "来週火曜", metric: "変更要求件数" },
    ],
  },
  {
    label: "経営レビュー",
    queue: [
      {
        title: "判断前提の裏付け不足",
        description: "意思決定の根拠データが不足しています。",
        severity: "critical",
      },
      {
        title: "代替シナリオ未検討",
        description: "下振れケースの検討が不足しています。",
        severity: "warning",
      },
    ],
    assumptions: [
      "市場成長は計画通り推移する",
      "リソース配分の変更は短期成果に影響しない",
      "既存施策の再現性は維持される",
    ],
    counterArguments: [
      "市場成長鈍化で前提KPIが崩れる可能性がある",
      "リソース再配分で既存売上が毀損する可能性がある",
      "再現性の前提が外れた場合に備えた代替案が不足",
    ],
    actions: [
      { task: "主要前提の感度分析", owner: "経営企画", due: "来週水曜", metric: "前提検証完了率" },
      { task: "下振れシナリオの対策設計", owner: "事業責任者", due: "来週金曜", metric: "対策カバレッジ" },
      { task: "代替投資案の比較資料作成", owner: "Finance", due: "翌週月曜", metric: "比較案数" },
    ],
  },
];

function extractMeetingProfileLabel(text: string): string {
  const match = text.match(/会議タイプ:\s*([^\n]+)/);
  return match?.[1]?.trim() ?? "経営レビュー";
}

function extractUserRequest(text: string): string {
  const marker = "ユーザー依頼:\n";
  const index = text.lastIndexOf(marker);
  if (index === -1) {
    return text.trim();
  }
  return text.slice(index + marker.length).trim();
}

function resolveApprovalAction(text: string): string | null {
  if (text.includes("本番送信") || text.includes("本番送付")) {
    return "営業提案の外部送付";
  }
  if (text.includes("本番オファー") || text.includes("本番内定")) {
    return "オファー通知";
  }
  if (text.includes("本番配布") || text.includes("本番共有")) {
    return "リサーチレポート配布";
  }
  if (text.includes("本番公開")) {
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

function buildDevilsAdvocateReply(demo: DemoId): MockReply {
  const artifactName =
    demo === "sales"
      ? "sales-devils-advocate.md"
      : demo === "recruiting"
        ? "recruiting-devils-advocate.md"
        : demo === "meeting"
          ? "meeting-devils-advocate.md"
        : "research-devils-advocate.md";

  return {
    message:
      "悪魔の代弁者として、前提の穴と失敗シナリオを抽出しました。追加検証クエリを次ループへ投入してください。",
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: `${demo}-devil-queue-1`,
        title: "反証ポイント検証",
        description: "抽出した反証ポイントを次ループで検証してください。",
        severity: "warning",
        timestamp: now(),
      },
    ],
    plan: [
      { id: `${demo}-devil-plan-1`, title: "前提の分解", status: "done" },
      { id: `${demo}-devil-plan-2`, title: "失敗シナリオ抽出", status: "done" },
      { id: `${demo}-devil-plan-3`, title: "追加検証クエリ生成", status: "doing" },
    ],
    tasks: [
      { id: `${demo}-devil-task-1`, label: "反証ポイントの優先順位付け", done: false },
      { id: `${demo}-devil-task-2`, label: "失敗シナリオの事実確認", done: false },
      { id: `${demo}-devil-task-3`, label: "追加検証クエリの実行", done: false },
    ],
    tools: getCommonToolEvents("devils-advocate-agent"),
    artifacts: [
      {
        id: `${demo}-devils-advocate`,
        name: artifactName,
        kind: "markdown",
        content:
          "# Devil's Advocate Review\n\n" +
          "## 1. 反証ポイント\n" +
          "- 重要前提が公開情報で裏取りされていない\n" +
          "- 過去データの延長線を前提にし過ぎている\n" +
          "- 代替シナリオ（競合/市場変化）の比較が不足\n\n" +
          "## 2. 失敗シナリオ\n" +
          "- KPI未達でも意思決定が進み、後戻りコストが増大\n" +
          "- 短期シグナルに引っ張られて長期判断を誤る\n\n" +
          "## 3. 追加検証クエリ\n" +
          "- `counter evidence for current hypothesis`\n" +
          "- `what assumptions break under downside scenario`\n" +
          "- `alternative strategy benchmarks from similar cases`",
        updatedAt: now(),
      },
    ],
    citations: [],
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

function buildSalesReply(text: string): MockReply {
  const objective = text.includes("採用") ? "採用業務の効率化提案" : mockSalesOutreachDraft.objective;

  const draft = {
    ...mockSalesOutreachDraft,
    objective,
  };

  return {
    message:
      "営業向けのアカウント調査結果を反映し、提案骨子・反証ポイント・次ループ用クエリを更新しました。",
    approval: { required: false, action: "", reason: "" },
    queue: [
      {
        id: "sales-alert-1",
        title: "反証シミュレーション未実施",
        description: "提案の弱点を先に洗い出すと商談初回の精度が上がります。",
        severity: "warning",
        timestamp: now(),
      },
      {
        id: "sales-alert-2",
        title: "次ループ候補",
        description: "競合企業のシグナル収集クエリを追加してください。",
        severity: "info",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "s-plan-1", title: "アカウント情報収集", status: "done" },
      { id: "s-plan-2", title: "提案骨子作成", status: "done" },
      { id: "s-plan-3", title: "反証シミュレーション", status: "doing" },
      { id: "s-plan-4", title: "次ループクエリ生成", status: "todo" },
    ],
    tasks: [
      { id: "s-task-1", label: "顧客課題の優先度確認", done: false },
      { id: "s-task-2", label: "提案資料の数値根拠追記", done: false },
      { id: "s-task-3", label: "反証ポイントの検証", done: false },
      { id: "s-task-4", label: "次ループクエリ生成", done: false },
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
          "先日のヒアリング内容をもとに、開発生産性と採用効率を同時に改善する導入プランを整理しました。反証ポイントを踏まえて改善ループを回してください。",
        updatedAt: now(),
      },
      {
        id: "sales-next-queries",
        name: "next-loop-queries.md",
        kind: "markdown",
        content:
          "# Next Loop Queries\n\n" +
          "- `compare ${mockSalesAccountInsight.orgLogin} with competitor adoption signal`\n" +
          "- `estimate ROI objection scenarios in first meeting`\n" +
          "- `find strongest proof points for adoption timeline`",
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
    message:
      "採用オペレーション向けに候補者サマリ、面接計画、懸念シミュレーション、次探索条件を更新しました。",
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
        title: "評価観点のズレ",
        description: "面接官ごとに観点が異なるため質問セットの統一が必要です。",
        severity: "warning",
        timestamp: now(),
      },
    ],
    plan: [
      { id: "r-plan-1", title: "候補者情報整理", status: "done" },
      { id: "r-plan-2", title: "面接官アサイン", status: "done" },
      { id: "r-plan-3", title: "懸念シミュレーション", status: "doing" },
      { id: "r-plan-4", title: "次探索条件生成", status: "todo" },
    ],
    tasks: [
      { id: "r-task-1", label: "候補者評価の回収", done: false },
      { id: "r-task-2", label: "次面接日程の確定", done: false },
      { id: "r-task-3", label: "懸念点への質問追加", done: false },
      { id: "r-task-4", label: "次探索条件の定義", done: false },
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
      {
        id: "recruiting-next-queries",
        name: "next-candidate-queries.md",
        kind: "markdown",
        content:
          "# Next Candidate Query Ideas\n\n" +
          "- `frontend engineer design system b2b saas leadership`\n" +
          "- `typescript performance optimization large scale products`\n" +
          "- `hiring signal in remote japan market for senior frontend`",
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

function buildMeetingReply(text: string): MockReply {
  const profileLabel = extractMeetingProfileLabel(text);
  const template =
    MEETING_TEMPLATES.find((item) => item.label === profileLabel) ??
    MEETING_TEMPLATES.find((item) => item.label === "経営レビュー")!;
  const userRequest = extractUserRequest(text);
  const meetingSummary =
    userRequest.length > 0 ? userRequest : `${mockMeetingTranscript.title}: ${mockMeetingTranscript.excerpt}`;

  return {
    message: `${template.label}として会議ログをレビューし、反証・修正案・次アクション表を更新しました。`,
    approval: { required: false, action: "", reason: "" },
    queue: template.queue.map((item, index) => ({
      id: `meeting-alert-${index + 1}`,
      title: item.title,
      description: item.description,
      severity: item.severity,
      timestamp: now(),
    })),
    plan: [
      { id: "m-plan-1", title: "議事録の要点抽出", status: "done" },
      { id: "m-plan-2", title: `${template.label}の前提整理`, status: "done" },
      { id: "m-plan-3", title: "悪魔の代弁者レビュー", status: "doing" },
      { id: "m-plan-4", title: "次回までのタスク生成", status: "todo" },
    ],
    tasks: template.actions.map((action, index) => ({
      id: `m-task-${index}`,
      label: action.task,
      done: false,
    })),
    tools: getCommonToolEvents("meeting-red-team-agent"),
    artifacts: [
      {
        id: "meeting-minutes",
        name: "meeting-minutes.md",
        kind: "markdown",
        content:
          `# 会議レビュー結果 (${template.label})\n\n${meetingSummary}\n\n` +
          "## 会議要約\n- 本会議の主要論点を抽出\n- 前提とリスクを再評価\n\n" +
          "## 反証ポイント\n" +
          template.counterArguments.map((item) => `- ${item}`).join("\n") +
          "\n\n## 修正案\n" +
          template.assumptions.map((item) => `- ${item}`).join("\n"),
        updatedAt: now(),
      },
      {
        id: "meeting-review",
        name: "meeting-review.json",
        kind: "json",
        content: JSON.stringify(
          {
            ...mockMeetingReview,
            profile: template.label,
            assumptions: template.assumptions,
            counterArguments: template.counterArguments,
            nextActions: template.actions.map((action) => action.task),
          },
          null,
          2,
        ),
        updatedAt: now(),
      },
      {
        id: "meeting-next-actions",
        name: "meeting-next-actions.md",
        kind: "markdown",
        content:
          `# Next Actions (${template.label})\n\n` +
          "| タスク | 担当 | 期限 | 検証指標 |\n" +
          "| --- | --- | --- | --- |\n" +
          template.actions
            .map((action) => `| ${action.task} | ${action.owner} | ${action.due} | ${action.metric} |`)
            .join("\n"),
        updatedAt: now(),
      },
    ],
    citations: [
      {
        id: "meeting-decision-checklist",
        title: "Decision Review Checklist",
        url: "https://hbr.org/2006/01/before-you-make-that-big-decision",
        quote: "意思決定前に反対意見を意図的に取り込むと質が向上する。",
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
        description: "結果提示前にIR提出書類のリンク有効性と提出日を再確認してください。",
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
  if (input.text.includes("悪魔の代弁者")) {
    return buildDevilsAdvocateReply(input.demo);
  }

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
  if (input.demo === "meeting") {
    return buildMeetingReply(input.text);
  }
  return buildResearchReply(input.text);
}
