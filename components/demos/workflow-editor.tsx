"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { WorkflowGraph } from "@/types/demo";

interface WorkflowEditorProps {
  storageKey: string;
  initialGraph: WorkflowGraph;
  title: string;
}

const statusOrder = ["todo", "doing", "done"] as const;

export function WorkflowEditor({ storageKey, initialGraph, title }: WorkflowEditorProps) {
  const [graph, setGraph] = useState<WorkflowGraph>(() => {
    if (typeof window === "undefined") {
      return initialGraph;
    }

    const cached = localStorage.getItem(storageKey);
    if (!cached) {
      return initialGraph;
    }

    try {
      const parsed = JSON.parse(cached) as WorkflowGraph;
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        return parsed;
      }
    } catch {
      return initialGraph;
    }

    return initialGraph;
  });
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeOwner, setNewNodeOwner] = useState("");
  const [edgeFrom, setEdgeFrom] = useState<string | undefined>(undefined);
  const [edgeTo, setEdgeTo] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const nodeOptions = useMemo(() => graph.nodes.map((node) => node.id), [graph.nodes]);

  const addNode = () => {
    const label = newNodeLabel.trim();
    const owner = newNodeOwner.trim();
    if (!label || !owner) {
      setStatusMessage("ノード名と担当を入力してください。");
      return;
    }

    const id = `node-${Date.now()}`;
    setGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, { id, label, owner, status: "todo" }],
    }));
    setNewNodeLabel("");
    setNewNodeOwner("");
    setStatusMessage("ノードを追加しました。");
  };

  const addEdge = () => {
    if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) {
      setStatusMessage("有効な From / To を選択してください。");
      return;
    }

    setGraph((prev) => ({
      ...prev,
      edges: [...prev.edges, { from: edgeFrom, to: edgeTo }],
    }));
    setEdgeFrom(undefined);
    setEdgeTo(undefined);
    setStatusMessage("エッジを追加しました。");
  };

  const toggleStatus = (nodeId: string) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const index = statusOrder.indexOf(node.status);
        const nextStatus = statusOrder[(index + 1) % statusOrder.length];
        return {
          ...node,
          status: nextStatus,
        };
      }),
    }));
  };

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(graph));
    setStatusMessage("フローを保存しました。");
  };

  const reload = () => {
    const cached = localStorage.getItem(storageKey);
    if (!cached) {
      setStatusMessage("保存済みデータがありません。");
      return;
    }

    try {
      setGraph(JSON.parse(cached) as WorkflowGraph);
      setStatusMessage("保存済みフローを読み込みました。");
    } catch {
      setStatusMessage("保存済みフローの読み込みに失敗しました。");
    }
  };

  return (
    <Card className="border-border/80 bg-card/95">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-semibold">ノード追加</p>
            <Input value={newNodeLabel} onChange={(event) => setNewNodeLabel(event.target.value)} placeholder="作業名" />
            <Input value={newNodeOwner} onChange={(event) => setNewNodeOwner(event.target.value)} placeholder="担当" />
            <Button type="button" size="sm" onClick={addNode}>
              ノード追加
            </Button>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-semibold">エッジ追加</p>
            <Select value={edgeFrom} onValueChange={setEdgeFrom}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Fromを選択" />
              </SelectTrigger>
              <SelectContent>
                {nodeOptions.map((nodeId) => (
                  <SelectItem key={nodeId} value={nodeId}>
                    {nodeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={edgeTo} onValueChange={setEdgeTo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Toを選択" />
              </SelectTrigger>
              <SelectContent>
                {nodeOptions.map((nodeId) => (
                  <SelectItem key={nodeId} value={nodeId}>
                    {nodeId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" onClick={addEdge}>
              エッジ追加
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-2">
          {graph.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => toggleStatus(node.id)}
              className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/35"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{node.label}</p>
                <Badge
                  variant={node.status === "done" ? "default" : "outline"}
                  className={node.status === "doing" ? "bg-amber-100 text-amber-800" : ""}
                >
                  {node.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">担当: {node.owner}</p>
            </button>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/15 p-3">
          <p className="text-sm font-semibold">エッジ一覧</p>
          {graph.edges.length === 0 ? (
            <p className="text-xs text-muted-foreground">未設定</p>
          ) : (
            <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
              {graph.edges.map((edge, index) => (
                <li key={`${edge.from}-${edge.to}-${index}`}>
                  {edge.from} → {edge.to}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save}>
            保存
          </Button>
          <Button type="button" variant="outline" onClick={reload}>
            再読込
          </Button>
        </div>

        {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
