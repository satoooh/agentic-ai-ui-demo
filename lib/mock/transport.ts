import type { AnnouncementDraft, OperationEvent } from "@/types/demo";

export const mockOperationEvents: OperationEvent[] = [
  {
    line: "中央線快速",
    status: "遅延",
    details: "信号確認の影響で上下線に最大15分遅れ",
    updatedAt: "2026-02-22T08:15:00+09:00",
    sourceUrl: "https://example.local/mock/odpt/chuo",
  },
  {
    line: "山手線",
    status: "平常",
    details: "遅延情報なし",
    updatedAt: "2026-02-22T08:10:00+09:00",
    sourceUrl: "https://example.local/mock/odpt/yamanote",
  },
];

export const mockAnnouncementDraft: AnnouncementDraft = {
  web: "中央線快速は信号確認の影響で遅れが発生しています。振替輸送をご利用ください。",
  stationDisplay: "中央線快速 遅延中 / 振替輸送実施",
  voiceScript:
    "ご利用のお客様にご案内いたします。中央線快速は信号確認の影響で遅れが発生しています。振替輸送をご利用ください。",
  languages: ["ja", "en"],
};
