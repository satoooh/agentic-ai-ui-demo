import { NextResponse } from "next/server";
import { z } from "zod";
import { listSessions, saveSession } from "@/lib/db/repository";
import type { DemoSessionSnapshot, ModelProvider } from "@/types/chat";
import type { WorkflowGraph } from "@/types/demo";

export const runtime = "nodejs";

const postSchema = z.object({
  demo: z.enum(["meeting", "research"]),
  title: z.string().min(1),
  modelProvider: z.enum(["openai", "gemini"]),
  modelId: z.string().min(1),
  messages: z.array(z.unknown()),
  queue: z.array(z.unknown()),
  plan: z.array(z.unknown()),
  tasks: z.array(z.unknown()),
  artifacts: z.array(z.unknown()),
  tools: z.array(z.unknown()),
  workflow: z.unknown().optional(),
});

const getQuerySchema = z.object({
  demo: z.enum(["meeting", "research"]),
  limit: z.coerce.number().int().positive().max(30).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = getQuerySchema.safeParse({
    demo: searchParams.get("demo"),
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const sessions = await listSessions({
      demo: parsed.data.demo,
      limit: parsed.data.limit,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to list sessions",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();

  try {
    await saveSession({
      id,
      demo: parsed.data.demo,
      mode: "live",
      payload: {
        modelProvider: parsed.data.modelProvider as ModelProvider,
        modelId: parsed.data.modelId,
        title: parsed.data.title,
        messages: parsed.data.messages,
        queue: parsed.data.queue as DemoSessionSnapshot["queue"],
        plan: parsed.data.plan as DemoSessionSnapshot["plan"],
        tasks: parsed.data.tasks as DemoSessionSnapshot["tasks"],
        artifacts: parsed.data.artifacts as DemoSessionSnapshot["artifacts"],
        tools: parsed.data.tools as DemoSessionSnapshot["tools"],
        workflow: parsed.data.workflow as WorkflowGraph | undefined,
      },
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to save session",
        message: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
