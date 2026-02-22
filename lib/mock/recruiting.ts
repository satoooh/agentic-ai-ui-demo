import type { CandidateBrief, RecruitingJobPosting, WorkflowGraph } from "@/types/demo";

export const mockRecruitingJobs: RecruitingJobPosting[] = [
  {
    id: "job-frontend-1",
    title: "Senior Frontend Engineer",
    company: "Productive Cloud Inc.",
    location: "Tokyo",
    remote: true,
    tags: ["React", "TypeScript", "Design System"],
    url: "https://example.local/jobs/frontend",
    publishedAt: "2026-02-20T09:00:00+09:00",
  },
  {
    id: "job-platform-1",
    title: "Platform Engineer",
    company: "ScaleOps",
    location: "Remote",
    remote: true,
    tags: ["Kubernetes", "SRE", "Go"],
    url: "https://example.local/jobs/platform",
    publishedAt: "2026-02-19T18:30:00+09:00",
  },
  {
    id: "job-recruiter-1",
    title: "Technical Recruiter",
    company: "TalentBridge",
    location: "Osaka",
    remote: false,
    tags: ["ATS", "Hiring Ops", "Employer Branding"],
    url: "https://example.local/jobs/recruiter",
    publishedAt: "2026-02-18T11:15:00+09:00",
  },
];

export const mockCandidateBrief: CandidateBrief = {
  candidateId: "cand-048",
  role: "Senior Frontend Engineer",
  highlights: [
    "React/TypeScriptでのtoB SaaS開発経験5年以上",
    "デザインシステム導入と運用をリード",
    "技術記事とOSS活動での継続的アウトプット",
  ],
  concerns: ["英語での顧客折衝経験は限定的", "オファー期限が短い"],
  recommendation: "yes",
};

export const mockRecruitingWorkflow: WorkflowGraph = {
  nodes: [
    { id: "r1", label: "候補者スクリーニング", owner: "Recruiter", status: "done" },
    { id: "r2", label: "面接調整", owner: "Coordinator", status: "doing" },
    { id: "r3", label: "評価集約", owner: "Hiring Manager", status: "todo" },
    { id: "r4", label: "オファー承認", owner: "HRBP", status: "todo" },
  ],
  edges: [
    { from: "r1", to: "r2" },
    { from: "r2", to: "r3" },
    { from: "r3", to: "r4" },
  ],
};
