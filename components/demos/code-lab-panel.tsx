"use client";

import { useMemo, useState } from "react";
import type { BundledLanguage } from "shiki";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ai-elements/code-block";
import {
  Commit,
  CommitActions,
  CommitContent,
  CommitCopyButton,
  CommitFile,
  CommitFileAdditions,
  CommitFileChanges,
  CommitFileDeletions,
  CommitFileIcon,
  CommitFileInfo,
  CommitFilePath,
  CommitFileStatus,
  CommitFiles,
  CommitHash,
  CommitHeader,
  CommitInfo,
  CommitMessage,
  CommitMetadata,
  CommitSeparator,
} from "@/components/ai-elements/commit";
import {
  EnvironmentVariable,
  EnvironmentVariableCopyButton,
  EnvironmentVariableGroup,
  EnvironmentVariableName,
  EnvironmentVariableValue,
  EnvironmentVariables,
  EnvironmentVariablesContent,
  EnvironmentVariablesHeader,
  EnvironmentVariablesTitle,
  EnvironmentVariablesToggle,
} from "@/components/ai-elements/environment-variables";
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/ai-elements/file-tree";
import { PackageInfo } from "@/components/ai-elements/package-info";
import { SchemaDisplay } from "@/components/ai-elements/schema-display";
import {
  StackTrace,
  StackTraceActions,
  StackTraceContent,
  StackTraceCopyButton,
  StackTraceError,
  StackTraceErrorMessage,
  StackTraceErrorType,
  StackTraceExpandButton,
  StackTraceFrames,
  StackTraceHeader,
} from "@/components/ai-elements/stack-trace";
import { Terminal } from "@/components/ai-elements/terminal";
import {
  TestResults,
  TestResultsContent,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummary,
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
  TestSuiteStats,
} from "@/components/ai-elements/test-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

  const folders = useMemo(
    () => Array.from(new Set(snippets.map((snippet) => snippet.fileName.split("/")[0] ?? "root"))),
    [snippets],
  );

  const runTests = () => {
    const nextRun = runCount + 1;
    setRunCount(nextRun);

    if (nextRun === 1) {
      setLogs([
        "$ npm run test",
        "Running connector tests...",
        "✗ connectors/research-signal.test.ts",
        "TypeError: Failed to parse Wikidata response payload",
      ]);
      return;
    }

    setLogs([
      "$ npm run test",
      "Running connector tests...",
      "✓ connectors/research-signal.test.ts",
      "✓ pipelines/company-brief.test.ts",
      "All tests passed.",
    ]);
  };

  const failed = runCount === 1;
  const passed = runCount >= 2;

  const testSummary =
    runCount === 0
      ? undefined
      : failed
        ? { passed: 0, failed: 1, skipped: 0, total: 1, duration: 1450 }
        : { passed: 2, failed: 0, skipped: 0, total: 2, duration: 980 };

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">Code / Terminal / Test / StackTrace</Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <SchemaDisplay
            method="GET"
            path="/api/connectors/research-signal?query={query}"
            description="Corporate research connector schema (MVP)."
            parameters={[
              {
                name: "query",
                type: "string",
                required: true,
                location: "query",
                description: "企業名またはティッカー",
              },
            ]}
          />

          <FileTree
            defaultExpanded={new Set(folders)}
            selectedPath={selectedSnippet?.id}
            onSelect={(path) => setSelectedSnippetId(typeof path === "string" ? path : selectedSnippetId)}
            className="text-xs"
          >
            {folders.map((folder) => (
              <FileTreeFolder key={folder} path={folder} name={folder}>
                {snippets
                  .filter((snippet) => snippet.fileName.startsWith(`${folder}/`))
                  .map((snippet) => (
                    <FileTreeFile key={snippet.id} path={snippet.id} name={snippet.fileName.split("/").slice(1).join("/")} />
                  ))}
              </FileTreeFolder>
            ))}
          </FileTree>

          <EnvironmentVariables defaultShowValues={false}>
            <EnvironmentVariablesHeader>
              <EnvironmentVariablesTitle />
              <EnvironmentVariablesToggle />
            </EnvironmentVariablesHeader>
            <EnvironmentVariablesContent>
              {envVars.map((envVar) => (
                <EnvironmentVariable key={envVar} name={envVar} value={`\${${envVar}}`}>
                  <EnvironmentVariableGroup>
                    <EnvironmentVariableName />
                    <Badge variant="outline" className="text-[10px]">
                      required
                    </Badge>
                  </EnvironmentVariableGroup>
                  <EnvironmentVariableGroup>
                    <EnvironmentVariableValue />
                    <EnvironmentVariableCopyButton size="icon-xs" />
                  </EnvironmentVariableGroup>
                </EnvironmentVariable>
              ))}
            </EnvironmentVariablesContent>
          </EnvironmentVariables>
        </div>

        <div className="space-y-3">
          <CodeBlock
            code={selectedSnippet?.content ?? ""}
            language={(selectedSnippet?.language ?? "ts") as BundledLanguage}
            showLineNumbers
          >
            <CodeBlockHeader>
              <CodeBlockTitle>
                <CodeBlockFilename>{selectedSnippet?.fileName}</CodeBlockFilename>
              </CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton />
              </CodeBlockActions>
            </CodeBlockHeader>
          </CodeBlock>

          <Terminal output={logs.join("\n")} isStreaming={runCount > 0 && !passed} />

          <div className="flex justify-end">
            <Button type="button" onClick={runTests}>
              Run tests
            </Button>
          </div>

          <TestResults summary={testSummary}>
            <TestResultsHeader>
              <TestResultsSummary />
            </TestResultsHeader>
            <TestResultsContent>
              {testSummary ? <TestResultsProgress /> : <p className="text-xs text-muted-foreground">未実行</p>}
              {testSummary ? (
                <TestSuite name="connectors" status={failed ? "failed" : "passed"} defaultOpen>
                  <TestSuiteName />
                  <TestSuiteContent>
                    <TestSuiteStats passed={passed ? 2 : 0} failed={failed ? 1 : 0} />
                  </TestSuiteContent>
                </TestSuite>
              ) : null}
            </TestResultsContent>
          </TestResults>

          {failed ? (
            <StackTrace
              trace={`TypeError: Failed to parse Wikidata response payload
  at fetchWikidataSignals (connectors/research-signal.ts:286:15)
  at runCompanyBriefPipeline (pipelines/company-brief.ts:14:9)`}
              defaultOpen
            >
              <StackTraceHeader>
                <StackTraceError>
                  <StackTraceErrorType />
                  <StackTraceErrorMessage />
                </StackTraceError>
                <StackTraceActions>
                  <StackTraceCopyButton />
                  <StackTraceExpandButton />
                </StackTraceActions>
              </StackTraceHeader>
              <StackTraceContent>
                <StackTraceFrames />
              </StackTraceContent>
            </StackTrace>
          ) : null}

          <Separator />

          <Commit defaultOpen>
            <CommitHeader>
              <CommitInfo>
                <CommitHash>b6a12e9</CommitHash>
                <CommitMessage>feat(research): switch to keyless SEC/GDELT/Wikidata sources</CommitMessage>
                <CommitMetadata>
                  <span>ai-agent</span>
                  <CommitSeparator />
                  <span>just now</span>
                </CommitMetadata>
              </CommitInfo>
              <CommitActions>
                <CommitCopyButton hash="b6a12e9" />
              </CommitActions>
            </CommitHeader>
            <CommitContent>
              <CommitFiles>
                <CommitFile>
                  <CommitFileInfo>
                    <CommitFileStatus status="modified" />
                    <CommitFileIcon />
                    <CommitFilePath>connectors/research-signal.ts</CommitFilePath>
                  </CommitFileInfo>
                  <CommitFileChanges>
                    <CommitFileAdditions count={8} />
                    <CommitFileDeletions count={2} />
                  </CommitFileChanges>
                </CommitFile>
              </CommitFiles>
            </CommitContent>
          </Commit>

          <div className="grid gap-2 md:grid-cols-2">
            <PackageInfo name="drizzle-orm" currentVersion="0.44.0" newVersion="0.45.1" changeType="minor" />
            <PackageInfo name="@libsql/client" currentVersion="0.16.0" newVersion="0.17.0" changeType="minor" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
