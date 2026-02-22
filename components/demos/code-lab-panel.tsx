"use client";

import { useMemo, useState } from "react";
import type { CodeSnippet } from "@/types/chat";

interface CodeLabPanelProps {
  title: string;
  snippets: CodeSnippet[];
  envVars: string[];
}

export function CodeLabPanel({ title, snippets, envVars }: CodeLabPanelProps) {
  const [selectedSnippetId, setSelectedSnippetId] = useState(snippets[0]?.id ?? "");
  const [runCount, setRunCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    "$ npm run test",
    "No test run yet. Click 'Run tests' to simulate execution.",
  ]);

  const selectedSnippet = useMemo(
    () => snippets.find((snippet) => snippet.id === selectedSnippetId) ?? snippets[0],
    [selectedSnippetId, snippets],
  );

  const runTests = () => {
    const nextRun = runCount + 1;
    setRunCount(nextRun);

    if (nextRun === 1) {
      setLogs([
        "$ npm run test",
        "Running connector tests...",
        "✗ connectors/estat.test.ts",
        "TypeError: Cannot read properties of undefined (reading 'GET_STATS_DATA')",
      ]);
      return;
    }

    setLogs([
      "$ npm run test",
      "Running connector tests...",
      "✓ connectors/estat.test.ts",
      "✓ pipelines/weekly-report.test.ts",
      "All tests passed.",
    ]);
  };

  const failed = runCount === 1;
  const passed = runCount >= 2;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">Schema / FileTree / Terminal / TestResults / StackTrace の最小体験。</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">FileTree</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {snippets.map((snippet) => (
              <li key={snippet.id}>
                <button
                  type="button"
                  onClick={() => setSelectedSnippetId(snippet.id)}
                  className={`w-full rounded px-2 py-1 text-left ${
                    selectedSnippet?.id === snippet.id ? "bg-slate-900 text-white" : "bg-slate-100"
                  }`}
                >
                  {snippet.fileName}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm font-semibold text-slate-900">EnvironmentVariables</p>
          <ul className="mt-1 list-inside list-disc text-xs text-slate-700">
            {envVars.map((envVar) => (
              <li key={envVar}>{envVar}</li>
            ))}
          </ul>
        </aside>

        <div className="space-y-3">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">CodeBlock</p>
            <pre className="mt-2 max-h-52 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {selectedSnippet?.content ?? ""}
            </pre>
          </div>

          <div className="rounded border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">Terminal / Sandbox</p>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {logs.join("\n")}
            </pre>
            <button
              type="button"
              onClick={runTests}
              className="mt-2 rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
            >
              Run tests
            </button>
          </div>

          <div className="rounded border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">TestResults</p>
            {runCount === 0 ? <p className="text-xs text-slate-600">未実行</p> : null}
            {failed ? <p className="text-xs text-red-600">1 failed / 0 passed</p> : null}
            {passed ? <p className="text-xs text-emerald-700">0 failed / 2 passed</p> : null}

            {failed ? (
              <div className="mt-2 rounded border border-red-200 bg-red-50 p-2">
                <p className="text-xs font-semibold text-red-700">StackTrace</p>
                <pre className="mt-1 overflow-auto text-[11px] text-red-700">
{`TypeError: Cannot read properties of undefined (reading 'GET_STATS_DATA')
  at fetchEstat (connectors/estat.ts:18:22)
  at runWeeklyPipeline (pipelines/weekly-report.ts:12:15)`}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="rounded border border-slate-200 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Commit / PackageInfo</p>
            <p className="mt-1">feat(gov): add connector pipeline mock and tests</p>
            <p className="mt-1">dependencies: drizzle-orm, @libsql/client</p>
          </div>
        </div>
      </div>
    </section>
  );
}
