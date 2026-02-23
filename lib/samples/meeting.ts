import type { MeetingSignal, WorkflowGraph } from "@/types/demo";

export type MeetingProfileId =
  | "general-review";

export interface MeetingTranscriptSample {
  id: string;
  meetingProfileId: MeetingProfileId;
  title: string;
  note: string;
  dirtyTranscript: string;
}

function buildLongMeetingTranscript(): string {
  const speakers = [
    "佐藤(営業Mgr)",
    "高橋(AE)",
    "山本(CS)",
    "中村(RevOps)",
    "伊藤(インサイド)",
    "鈴木(PM)",
  ];
  const agendaBlocks = [
    "A社PoCの進捗共有: 法務レビュー遅延・競合値下げ噂・予算再承認の有無を確認しないまま提案を進めると失注率が上がるので、今週中に検証項目を固定したい。",
    "B社既存深耕: 追加提案でARRを伸ばせる一方、CS稼働が逼迫して初期オンボーディング品質が落ちる懸念があるため、受注条件を段階導入前提で定義する必要がある。",
    "C社新規案件: 意思決定者が複数いて評価軸が揃っていない。営業資料は先行しているが導入後運用像が曖昧で、デモの訴求点が分散しているので論点統一が必要。",
    "Q2全体方針: 既存顧客アップセルを優先しつつ新規開拓を維持する計画。ただし現場稼働が限界に近く、優先順位を誤ると案件速度が落ちるため切り捨て基準の明文化が必要。",
    "今週アクションレビュー: owner未記入タスクと期限曖昧タスクが積み上がり、意思決定が次週へ持ち越される。実行可能性の低い指示を削って再計画する必要がある。",
    "見積と値引き条件: 競争環境を理由に値引きを急ぐ声があるが、値引きだけでは失注理由を潰せない。導入プロセスの不安解消をセットにしないと勝率が改善しにくい。",
  ];
  const noiseBlocks = [
    "えっと、前回メモだと担当が曖昧で、誰が顧客確認するか途中で止まってました。",
    "この点、社内Slackで別スレが立っていて情報が分散しています。まとめ直し要です。",
    "正直、数字は追えてるけど背景文脈が弱く、判断が人依存になってる感があります。",
    "いったん今の案で進めると、来週にやり直しが発生する確率が高いです。",
    "すみません、ここは仮説ベースで話してます。確定データはまだ取り切れていません。",
    "話が前後してますが、優先順位を固定しないと同じ議論を繰り返します。",
  ];
  const evidenceBlocks = [
    "参考数字: 先週の商談化率31%、提案化率44%、受注率18%。A社の稟議通過が2営業日遅れると月次見込みが約8%下振れする試算です。",
    "参考数字: B社の問い合わせ件数は先月比+22%。CS一次回答が24時間を超えると継続提案の反応率が落ちる傾向が出ています。",
    "参考数字: C社の意思決定会議は隔週で、次回は金曜。事前論点メモが48時間前に揃わないと決裁見送りになりやすいです。",
    "参考数字: 失注理由トップ3は『導入負荷不安』『社内合意不足』『費用対効果未説明』。単純な価格調整では改善が限定的でした。",
    "参考数字: 競合比較で機能差は優位ですが、運用定着の成功事例提示が不足。導入90日プランを提示した案件は継続率が高いです。",
    "参考数字: owner明記タスクは完了率が約2.1倍。期限のみ設定タスクは週跨ぎで棚上げされる割合が高いです。",
  ];
  const actionBlocks = [
    "次アクション案: 高橋がA社法務に確認項目5件を送付、佐藤が決裁者向け1枚サマリ更新、山本が導入後負荷の試算表を明日18時までに提出。",
    "次アクション案: 中村が案件優先度をS/A/Bで再ランク、伊藤が失注要因ヒアリングを3件実施、鈴木がデモ導線の不要要素を削除。",
    "次アクション案: 既存提案の対象条件を『利用部門2以上・運用担当明確』に限定し、過剰カスタム依頼は今週は受けない方針を仮置き。",
    "次アクション案: 競合値下げ情報は一次情報取得まで営業トークに反映しない。確認担当と期限を固定して、未確認情報の拡散を止める。",
    "次アクション案: 会議ログを次回からテンプレ化し、決定事項/保留事項/前提条件/検証方法を必須欄にする。owner空欄のまま終了しない。",
    "次アクション案: 今週金曜までに『提案しない案件』を明示し、現場負荷と受注確度のバランスを取る。理由は定量で残す。",
  ];

  const lines: string[] = [];
  for (let i = 0; i < 110; i += 1) {
    const elapsedSec = i * 3 + (i % 4);
    const minute = 2 + Math.floor(elapsedSec / 60);
    const second = elapsedSec % 60;
    const speaker = speakers[i % speakers.length];
    const agenda = agendaBlocks[i % agendaBlocks.length];
    const noise = noiseBlocks[i % noiseBlocks.length];
    const evidence = evidenceBlocks[i % evidenceBlocks.length];
    const action = actionBlocks[i % actionBlocks.length];
    const marker = i % 7 === 0 ? "TODO未確定" : i % 5 === 0 ? "要再確認" : "仮置き";

    lines.push(
      `[10:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}] ${speaker}: ${agenda} ${noise} ${evidence} ${action} (${marker})`,
    );
  }

  lines.push(
    "[10:11:54] 佐藤(営業Mgr): ここまでの議論を確定します。A社を最優先、B社は条件付き継続、C社は論点整理後に提案再開。次回会議までに前提崩壊シナリオを3件準備し、検証データを添えて再レビューします。",
  );
  return lines.join("\n");
}

const longMeetingTranscript = buildLongMeetingTranscript();

export const sampleMeetingTranscript = {
  title: "横断プロジェクト進捗レビュー会議",
  participants: ["進行役", "実行担当A", "実行担当B", "企画"],
  excerpt:
    "次四半期は重点施策を絞りつつ、既存施策の実行精度を上げる。" +
    "現場負荷が高いため、未確定タスクの棚卸しと優先順位の再設計を先に進める。",
};

export const sampleMeetingReview = {
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

export const sampleMeetingSignals: MeetingSignal[] = [
  {
    id: "meeting-signal-1",
    source: "hn",
    title: "Hiring slowdown and process bottlenecks",
    summary: "採用市場では候補者不足より選考速度と候補者体験が離脱要因になりやすい。",
    url: "https://example.local/meeting-signals/hiring-bottleneck",
    points: 132,
    comments: 41,
    publishedAt: "2026-02-20T09:20:00Z",
  },
  {
    id: "meeting-signal-2",
    source: "hn",
    title: "B2B expansion under constrained teams",
    summary: "新規施策より既存運用の自動化を優先した方が短期成果が出やすい。",
    url: "https://example.local/meeting-signals/b2b-expansion",
    points: 98,
    comments: 27,
    publishedAt: "2026-02-19T14:10:00Z",
  },
];

export const sampleMeetingWorkflow: WorkflowGraph = {
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

export const meetingTranscriptSamples: MeetingTranscriptSample[] = [
  {
    id: "meeting-sample-general-long-10min",
    meetingProfileId: "general-review",
    title: "会議サンプル: 10分ロング議事録（約3万字）",
    note: `長尺ログ（約${longMeetingTranscript.length.toLocaleString("ja-JP")}文字）で、前提崩壊リスクと実行順序を整理したい。`,
    dirtyTranscript: longMeetingTranscript,
  },
  {
    id: "meeting-sample-general-priority",
    meetingProfileId: "general-review",
    title: "会議サンプル: 優先度調整ミーティング",
    note: "未確定タスクと前提リスクを整理し、次回までの実行順序を再設計する会議メモ",
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
    id: "meeting-sample-general-funnel",
    meetingProfileId: "general-review",
    title: "会議サンプル: 実行フローボトルネック確認",
    note: "進行の詰まりが入力不足か実行設計かを切り分けたい会議メモ",
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
    id: "meeting-sample-general-scope",
    meetingProfileId: "general-review",
    title: "会議サンプル: スコープ調整レビュー",
    note: "スコープ超過を前提に、残す/落とす対象を合意する会議メモ",
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
    id: "meeting-sample-general-investment",
    meetingProfileId: "general-review",
    title: "会議サンプル: 投資配分の見直し",
    note: "複数施策の投資配分と下振れ前提を再確認する会議メモ",
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
