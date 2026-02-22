import type { MeetingSignal, WorkflowGraph } from "@/types/demo";

export type MeetingProfileId =
  | "sales-weekly"
  | "hiring-sync"
  | "product-planning"
  | "exec-review";

export interface MeetingTranscriptSample {
  id: string;
  meetingProfileId: MeetingProfileId;
  title: string;
  note: string;
  dirtyTranscript: string;
}

export const mockMeetingTranscript = {
  title: "営業・採用横断の週次オペレーション会議",
  participants: ["営業責任者", "採用責任者", "PM", "経営企画"],
  excerpt:
    "Q2は採用を優先しつつ、既存顧客の追加提案も増やす。現場の負荷が高いため、" +
    "来月までは新規施策を増やしすぎない方針。",
};

export const mockMeetingReview = {
  summary:
    "リソース制約下で採用と売上の両立を目指す方針。優先順位の明確化と実行条件の定義が不足している。",
  assumptions: [
    "既存顧客向け提案は現場負荷を増やさずに実行できる",
    "採用のボトルネックは候補者数不足であり、選考プロセスではない",
    "来月の市場環境は大きく変化しない",
  ],
  counterArguments: [
    "追加提案はCS対応を増やし、短期的に現場負荷を悪化させる可能性がある",
    "採用停滞の主要因は候補者数ではなく選考速度と評価基準の不一致かもしれない",
    "競合の値下げや市場変化で既存提案が刺さらなくなる可能性がある",
  ],
  nextActions: [
    "1週間で実行可能な施策だけに絞った優先順位表を作成する",
    "採用は歩留まり分解（応募→書類→面接→内定）でボトルネックを再特定する",
    "提案施策の失敗条件を先に定義し、毎週レビューする",
  ],
};

export const mockMeetingSignals: MeetingSignal[] = [
  {
    id: "meeting-signal-1",
    source: "mock",
    title: "Hiring slowdown and process bottlenecks",
    summary: "採用市場では候補者不足より選考速度と候補者体験が離脱要因になりやすい。",
    url: "https://example.local/meeting-signals/hiring-bottleneck",
    points: 132,
    comments: 41,
    publishedAt: "2026-02-20T09:20:00Z",
  },
  {
    id: "meeting-signal-2",
    source: "mock",
    title: "B2B expansion under constrained teams",
    summary: "新規施策より既存運用の自動化を優先した方が短期成果が出やすい。",
    url: "https://example.local/meeting-signals/b2b-expansion",
    points: 98,
    comments: 27,
    publishedAt: "2026-02-19T14:10:00Z",
  },
];

export const mockMeetingWorkflow: WorkflowGraph = {
  nodes: [
    { id: "m1", label: "議事録入力", owner: "Facilitator", status: "done" },
    { id: "m2", label: "主張・前提の抽出", owner: "Agent", status: "done" },
    { id: "m3", label: "悪魔の代弁者レビュー", owner: "Agent", status: "doing" },
    { id: "m4", label: "反証を踏まえた修正案", owner: "Team Lead", status: "todo" },
    { id: "m5", label: "次アクション確定", owner: "PM", status: "todo" },
  ],
  edges: [
    { from: "m1", to: "m2" },
    { from: "m2", to: "m3" },
    { from: "m3", to: "m4" },
    { from: "m4", to: "m5" },
  ],
};

export const mockMeetingTranscriptSamples: MeetingTranscriptSample[] = [
  {
    id: "meeting-sample-sales-q2",
    meetingProfileId: "sales-weekly",
    title: "営業週次: Q2大型案件フォロー",
    note: "大型案件の失注リスクと、既存顧客提案の優先度を再検討する会議メモ",
    dirtyTranscript: [
      "[10:02] 佐藤(営業Mgr): A社PoCは継続、でも見積まだ。先方、予算きびしいって話あり",
      "10:03 高橋(AE) いやIT部長は前向きです。ただ法務レビューが2週間止まってる…",
      "[10:05] 山本(CS): 既存B社の追加提案は今週出せる。が、運用負荷あがる可能性ある",
      "10:06 佐藤: 受注優先で行きたい、けどサポート枠足りないのが本音",
      "[10:08] PM: 先週のアクション、担当未記入が3件残ってる。owner決めないと回らない",
      "10:09 高橋: A社は競合値下げの噂あり(未確認) ここ検証しないと危険",
      "[10:10] 佐藤: えっと、じゃあA社は来週火曜までに再提案案…いや金曜?? どっち",
      "10:11 山本: 金曜は無理。月曜午前なら現実的",
      "[10:12] 佐藤: 了解。B社追加提案は保留気味で。A社優先で進める、で一旦。",
    ].join("\n"),
  },
  {
    id: "meeting-sample-hiring-funnel",
    meetingProfileId: "hiring-sync",
    title: "採用進捗: エンジニア採用ボトルネック",
    note: "応募数不足か選考体験の問題かを切り分けたい採用会議メモ",
    dirtyTranscript: [
      "[16:01] 採用責任者: 先月応募42、書類通過19、1次面接9、最終3、内定1",
      "16:02 Recruiter: 数字だけ見ると上流より面接後辞退が多い。候補者コメント雑多です",
      "[16:03] HM: 技術課題むずいって言われた。あと面接官ごと評価ブレてる気がする",
      "16:04 採用責任者: でも候補者数も足りてないよね?? 母集団施策も必要では",
      "[16:05] Recruiter: 直近3名、オファー前に他社決定。連絡遅い指摘あり",
      "16:06 HM: そこは認めます。FB返却が平均4.8日、長いです",
      "[16:07] 採用責任者: 今週のアクション決めたい。誰が何をいつまで？",
      "16:08 Recruiter: JD修正は私やる、面接官キャリブレーションは来週水でどうでしょう",
      "[16:09] HM: OK。ただ課題難度はA/Bテストしたい、結論急がないで",
    ].join("\n"),
  },
  {
    id: "meeting-sample-product-scope",
    meetingProfileId: "product-planning",
    title: "プロダクト計画: リリース範囲調整",
    note: "次スプリントのスコープ超過を前提に、落とす機能を合意したい会議メモ",
    dirtyTranscript: [
      "[13:30] PM: 次Sprint、要望が多くて12pt超過。全部は無理です",
      "13:31 TechLead: 決済改修は必須、でも通知機能まで入れると品質落ちる",
      "[13:33] Designer: 管理画面UI改善は今回入れないとCS問い合わせ増えるかも",
      "13:34 PM: 依存関係メモが古い。誰か最新化した??",
      "[13:35] TechLead: API側の仕様FIXまだ。木曜確定予定(遅れる可能性あり)",
      "13:36 PM: うーん、じゃ通知はβ扱い? いや運用負荷が…",
      "[13:37] Designer: βなら導線を限定してリスク下げられる",
      "13:38 PM: 決定事項: 決済は本番、通知は限定公開、UI改善は最低限のみ",
      "[13:39] TechLead: ownerと期限このあとチケット化します",
    ].join("\n"),
  },
  {
    id: "meeting-sample-exec-investment",
    meetingProfileId: "exec-review",
    title: "経営レビュー: 投資配分の見直し",
    note: "採用・営業・開発の投資配分を再調整する経営会議メモ",
    dirtyTranscript: [
      "[09:00] CEO: Q3は成長投資を維持したい。ただ現金余力は楽観できない",
      "09:01 経営企画: 直近3か月の回収は計画比-8%。広告効率も落ち気味",
      "[09:03] 事業責任者: それでも営業人員は増やしたい。パイプライン不足が先",
      "09:04 CEO: 採用凍結は避けたいが、全ポジション継続は厳しいかもしれない",
      "[09:05] 経営企画: 開発投資を減らすと来期の単価改善施策が遅れます",
      "09:06 事業責任者: いや短期売上ないと来期もない、って現場は言ってる",
      "[09:08] CEO: どの前提が外れたら計画破綻するか、そこを先に見たい",
      "09:09 経営企画: 為替/競合値下げ/採用単価上振れ、この3つは感応度高いです",
      "[09:10] CEO: 次回までに下振れケースの資金繰りシミュレーションを出しましょう",
    ].join("\n"),
  },
];
