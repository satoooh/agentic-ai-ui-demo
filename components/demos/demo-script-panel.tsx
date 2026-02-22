"use client";

import { useMemo, useState } from "react";

interface DemoScriptStep {
  id: string;
  at: string;
  cue: string;
  value: string;
}

interface DemoScriptPanelProps {
  title: string;
  summary: string;
  durationSec: number;
  steps: DemoScriptStep[];
}

export function DemoScriptPanel({ title, summary, durationSec, steps }: DemoScriptPanelProps) {
  const [copied, setCopied] = useState(false);

  const scriptText = useMemo(
    () =>
      [
        `${title} (${durationSec}秒)`,
        summary,
        ...steps.map((step) => `${step.at} ${step.cue} | ${step.value}`),
      ].join("\n"),
    [durationSec, steps, summary, title],
  );

  const copyScript = async () => {
    await navigator.clipboard.writeText(scriptText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">1-minute Demo Script</h2>
          <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700">
            {durationSec}s
          </span>
          <button
            type="button"
            onClick={() => void copyScript()}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
          >
            {copied ? "copied" : "copy script"}
          </button>
        </div>
      </div>

      <ol className="mt-3 grid gap-2 md:grid-cols-2">
        {steps.map((step) => (
          <li key={step.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
            <p className="font-semibold text-slate-900">
              {step.at} {step.cue}
            </p>
            <p className="mt-1 text-slate-700">{step.value}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
