import { AlertCircleIcon, CircleCheckIcon, KeyRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const configuredCount = rows.filter((row) => row.value !== "(unset)").length;

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card className="border-border/75">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRoundIcon className="size-5 text-primary" />
            Settings
          </CardTitle>
          <CardDescription>
            デモ連携に必要な環境変数を確認します。未設定でも <code>mock</code> で体験は継続可能です。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="font-medium">現在の状態</p>
            <p className="mt-1 text-muted-foreground">
              {configuredCount}/{rows.length} 項目が設定済み
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
            <p className="font-medium">運用メモ</p>
            <p className="mt-1 text-muted-foreground">
              `DEMO_MODE=mock` を既定にし、`ODPT_TOKEN` と `ESTAT_APP_ID` は必要時のみ live 化してください。
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/75">
        <CardContent className="p-0">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/35 text-foreground">
              <tr>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const configured = row.value !== "(unset)";
                return (
                  <tr key={row.key} className="border-t border-border/70 text-foreground">
                    <td className="px-4 py-3 font-medium">{row.key}</td>
                    <td className="px-4 py-3">
                      {row.required ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircleIcon className="size-3.5" />
                          required
                        </Badge>
                      ) : (
                        <Badge variant="outline">optional</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        {configured ? <CircleCheckIcon className="size-3.5 text-emerald-600" /> : null}
                        {row.value}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
