import type {
  DatasetCandidate,
  Evidence,
  GeneratedConnectorProject,
  StatSeries,
} from "@/types/demo";

export const mockDatasetCandidates: DatasetCandidate[] = [
  {
    title: "人口推計",
    org: "総務省統計局",
    landingUrl: "https://www.e-stat.go.jp/",
    apiHint: "e-Stat 統計表API: getStatsData",
  },
  {
    title: "事業所・企業統計",
    org: "経済産業省",
    landingUrl: "https://data.e-gov.go.jp/",
    apiHint: "e-Gov メタデータAPI経由で候補探索",
  },
];

export const mockStatSeries: StatSeries = {
  statsDataId: "0003412312",
  dimensions: ["都道府県", "年度"],
  data: [
    { label: "東京都 2024", value: 14076000 },
    { label: "大阪府 2024", value: 8760000 },
    { label: "福岡県 2024", value: 5110000 },
  ],
};

export const mockEvidence: Evidence[] = [
  {
    sourceTitle: "e-Stat 人口推計",
    url: "https://www.e-stat.go.jp/",
    quote: "2024年の主要都市圏人口は横ばい圏だが、地域差が拡大。",
  },
  {
    sourceTitle: "e-Gov データポータル",
    url: "https://data.e-gov.go.jp/",
    quote: "組織横断のデータセット探索をメタデータAPIで実施可能。",
  },
];

export const mockConnectorProject: GeneratedConnectorProject = {
  files: ["connectors/estat.ts", "connectors/egov.ts", "pipelines/weekly-report.ts"],
  tests: ["connectors/estat.test.ts", "pipelines/weekly-report.test.ts"],
  envVars: ["ESTAT_APP_ID"],
};
