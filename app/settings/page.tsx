import { env } from "@/lib/env";

const rows = [
  {
    key: "DEMO_MODE",
    required: true,
    value: env.DEMO_MODE,
    description: "mock | live の実行モード",
  },
  {
    key: "ODPT_TOKEN",
    required: false,
    value: env.ODPT_TOKEN ? "*** configured ***" : "(unset)",
    description: "公共交通デモの live 接続トークン",
  },
  {
    key: "ESTAT_APP_ID",
    required: false,
    value: env.ESTAT_APP_ID ? "*** configured ***" : "(unset)",
    description: "官公庁データデモの e-Stat appId",
  },
  {
    key: "OPENAI_API_KEY",
    required: false,
    value: env.OPENAI_API_KEY ? "*** configured ***" : "(unset)",
    description: "OpenAI live チャット利用時に必要",
  },
  {
    key: "OPENAI_MODEL",
    required: false,
    value: env.OPENAI_MODEL,
    description: "OpenAI 既定モデル",
  },
  {
    key: "GOOGLE_GENERATIVE_AI_API_KEY",
    required: false,
    value: env.GOOGLE_GENERATIVE_AI_API_KEY ? "*** configured ***" : "(unset)",
    description: "Gemini live チャット利用時に必要",
  },
  {
    key: "GEMINI_MODEL",
    required: false,
    value: env.GEMINI_MODEL,
    description: "Gemini 既定モデル",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-700">
          EnvironmentVariables コンポーネント実装前の下準備として、必要変数の有無と用途を一覧表示します。
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-slate-800">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Required</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-200 text-slate-700">
                <td className="px-4 py-3 font-medium">{row.key}</td>
                <td className="px-4 py-3">{row.required ? "yes" : "no"}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.value}</td>
                <td className="px-4 py-3">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
