import { and, desc, eq, sql } from "drizzle-orm";
import { artifacts, demoSessions } from "@/lib/db/schema";
import { createDbClient } from "@/lib/db/client";
import type {
  ArtifactItem,
  DemoId,
  DemoSessionSnapshot,
  ModelProvider,
  PlanStep,
  QueueItem,
  TaskItem,
  ToolEvent,
} from "@/types/chat";
import type { DemoMode, WorkflowGraph } from "@/types/demo";

interface SessionPayload {
  modelProvider: ModelProvider;
  modelId: string;
  title: string;
  messages: unknown[];
  queue: QueueItem[];
  plan: PlanStep[];
  tasks: TaskItem[];
  artifacts: ArtifactItem[];
  tools: ToolEvent[];
  workflow?: WorkflowGraph;
}

let isSchemaInitialized = false;

async function ensureSchema() {
  if (isSchemaInitialized) {
    return;
  }

  const db = createDbClient();

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS demo_sessions (
      id TEXT PRIMARY KEY,
      demo TEXT NOT NULL,
      mode TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  isSchemaInitialized = true;
}

export async function saveSession({
  id,
  demo,
  mode,
  payload,
}: {
  id: string;
  demo: DemoId;
  mode: DemoMode;
  payload: SessionPayload;
}) {
  await ensureSchema();
  const db = createDbClient();

  const now = new Date();

  await db
    .insert(demoSessions)
    .values({
      id,
      demo,
      mode,
      payload: JSON.stringify(payload),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: demoSessions.id,
      set: {
        payload: JSON.stringify(payload),
        updatedAt: now,
      },
    });

  if (payload.artifacts.length > 0) {
    await Promise.all(
      payload.artifacts.map((artifact) =>
        db
          .insert(artifacts)
          .values({
            id: artifact.id,
            sessionId: id,
            name: artifact.name,
            kind: artifact.kind,
            content: artifact.content,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: artifacts.id,
            set: {
              content: artifact.content,
              kind: artifact.kind,
              name: artifact.name,
            },
          }),
      ),
    );
  }
}

function parsePayload(payload: string): SessionPayload {
  try {
    return JSON.parse(payload) as SessionPayload;
  } catch {
    return {
      modelProvider: "openai",
      modelId: "gpt-5.1",
      title: "broken-payload",
      messages: [],
      queue: [],
      plan: [],
      tasks: [],
      artifacts: [],
      tools: [],
    };
  }
}

export async function listSessions({
  demo,
  mode,
  limit = 10,
}: {
  demo: DemoId;
  mode?: DemoMode;
  limit?: number;
}): Promise<Array<Pick<DemoSessionSnapshot, "id" | "title" | "updatedAt" | "modelProvider" | "modelId">>> {
  await ensureSchema();
  const db = createDbClient();

  const whereClause = mode
    ? and(eq(demoSessions.demo, demo), eq(demoSessions.mode, mode))
    : eq(demoSessions.demo, demo);

  const rows = await db
    .select({
      id: demoSessions.id,
      payload: demoSessions.payload,
      updatedAt: demoSessions.updatedAt,
    })
    .from(demoSessions)
    .where(whereClause)
    .orderBy(desc(demoSessions.updatedAt))
    .limit(limit);

  return rows.map((row) => {
    const payload = parsePayload(row.payload);
    return {
      id: row.id,
      title: payload.title,
      modelProvider: payload.modelProvider,
      modelId: payload.modelId,
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  });
}

export async function getSessionById(id: string): Promise<DemoSessionSnapshot | null> {
  await ensureSchema();
  const db = createDbClient();

  const row = await db.query.demoSessions.findFirst({
    where: eq(demoSessions.id, id),
  });

  if (!row) {
    return null;
  }

  const payload = parsePayload(row.payload);

  return {
    id: row.id,
    demo: row.demo as DemoId,
    mode: row.mode as DemoMode,
    modelProvider: payload.modelProvider,
    modelId: payload.modelId,
    title: payload.title,
    messages: payload.messages as DemoSessionSnapshot["messages"],
    queue: payload.queue,
    plan: payload.plan,
    tasks: payload.tasks,
    artifacts: payload.artifacts,
    tools: payload.tools,
    workflow: payload.workflow,
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
