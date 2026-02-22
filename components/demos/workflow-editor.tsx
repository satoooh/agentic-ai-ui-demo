"use client";

import { useMemo, useState } from "react";
import type { WorkflowGraph } from "@/types/demo";

interface WorkflowEditorProps {
  storageKey: string;
  initialGraph: WorkflowGraph;
  title: string;
}

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
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
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
    setStatusMessage("エッジを追加しました。");
  };

  const toggleStatus = (nodeId: string) => {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const nextStatus =
          node.status === "todo"
            ? "doing"
            : node.status === "doing"
              ? "done"
              : "todo";

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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">ノード編集と保存/再読込が可能な簡易Workflowエディタです。</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">ノード追加</h3>
          <input
            value={newNodeLabel}
            onChange={(event) => setNewNodeLabel(event.target.value)}
            placeholder="作業名"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <input
            value={newNodeOwner}
            onChange={(event) => setNewNodeOwner(event.target.value)}
            placeholder="担当"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={addNode}
            className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
          >
            ノード追加
          </button>
        </div>

        <div className="space-y-3 rounded border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">エッジ追加</h3>
          <select
            value={edgeFrom}
            onChange={(event) => setEdgeFrom(event.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">Fromを選択</option>
            {nodeOptions.map((nodeId) => (
              <option key={nodeId} value={nodeId}>
                {nodeId}
              </option>
            ))}
          </select>
          <select
            value={edgeTo}
            onChange={(event) => setEdgeTo(event.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          >
            <option value="">Toを選択</option>
            {nodeOptions.map((nodeId) => (
              <option key={nodeId} value={nodeId}>
                {nodeId}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addEdge}
            className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
          >
            エッジ追加
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {graph.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => toggleStatus(node.id)}
            className="rounded border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100"
          >
            <p className="text-sm font-semibold text-slate-900">{node.label}</p>
            <p className="text-xs text-slate-600">担当: {node.owner}</p>
            <p className="mt-1 text-xs text-slate-700">状態: {node.status}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-900">エッジ一覧</p>
        {graph.edges.length === 0 ? (
          <p className="text-xs text-slate-600">未設定</p>
        ) : (
          <ul className="mt-1 list-inside list-disc text-xs text-slate-700">
            {graph.edges.map((edge, index) => (
              <li key={`${edge.from}-${edge.to}-${index}`}>
                {edge.from} → {edge.to}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white"
        >
          保存
        </button>
        <button
          type="button"
          onClick={reload}
          className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700"
        >
          再読込
        </button>
      </div>

      {statusMessage ? <p className="mt-2 text-xs text-slate-600">{statusMessage}</p> : null}
    </section>
  );
}
