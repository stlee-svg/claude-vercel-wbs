import { NextRequest } from 'next/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp'
import * as z from 'zod/v4'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'

// MCP-Protocol-Version: 2025-11-25 (최신), 2025-03-26 (구형 클라이언트 폴백)
const SUPPORTED_PROTOCOLS = new Set(['2025-11-25', '2025-03-26'])

function guardEnabled(): Response | null {
  if (process.env.MCP_PUBLIC_ENABLED !== '1') {
    return Response.json({ error: 'MCP 엔드포인트가 비활성화되어 있습니다.' }, { status: 403 })
  }
  return null
}

// 헤더가 없으면 구형 폴백(2025-03-26)으로 간주 — 사양 허용. 명시적으로 지원 외 버전이면 400.
function checkProtocolVersion(req: NextRequest): Response | null {
  const clientVersion = req.headers.get('MCP-Protocol-Version')
  if (clientVersion !== null && !SUPPORTED_PROTOCOLS.has(clientVersion)) {
    return Response.json(
      { error: `지원하지 않는 MCP 프로토콜 버전입니다: ${clientVersion}` },
      { status: 400 }
    )
  }
  return null
}

// ---------- 입력 스키마 ----------

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const createTaskSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다.'),
  description: z.string().optional(),
  assignee: z.string().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().regex(datePattern, 'YYYY-MM-DD 형식이어야 합니다.').optional(),
  dueDate: z.string().regex(datePattern, 'YYYY-MM-DD 형식이어야 합니다.').optional(),
  parentId: z.string().uuid().optional(),
})

const updateTaskSchema = z.object({
  id: z.string().uuid('유효한 UUID여야 합니다.'),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().regex(datePattern).nullable().optional(),
  dueDate: z.string().regex(datePattern).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
})

// ---------- McpServer 빌더 ----------

function buildServer(): McpServer {
  const server = new McpServer({ name: 'wbs-mcp', version: '1.0.0' })

  server.registerTool(
    'list_tasks',
    { description: '모든 작업을 생성 시각 오름차순으로 반환합니다.' },
    async () => {
      const result = await db.select().from(tasks).orderBy(asc(tasks.createdAt))
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  )

  server.registerTool(
    'get_task',
    {
      description: 'UUID로 특정 작업 하나를 조회합니다.',
      inputSchema: z.object({ id: z.string().uuid() }),
    },
    async ({ id }) => {
      const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
      if (!task) {
        return { content: [{ type: 'text', text: '작업을 찾을 수 없습니다.' }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(task) }] }
    }
  )

  server.registerTool(
    'create_task',
    {
      description:
        '새 작업을 생성합니다. 진행률(progress)이 100이면 상태(status)가 자동으로 done이 됩니다. dueDate는 startDate 이후여야 합니다.',
      inputSchema: createTaskSchema,
    },
    async (input) => {
      const { title, description, assignee, status, progress, startDate, dueDate, parentId } = input

      if (startDate && dueDate && dueDate < startDate) {
        return {
          content: [{ type: 'text', text: '목표 기한(dueDate)은 시작일(startDate) 이후여야 합니다.' }],
          isError: true,
        }
      }

      const finalProgress = progress ?? 0
      const finalStatus = finalProgress === 100 ? 'done' : (status ?? 'todo')

      const [task] = await db
        .insert(tasks)
        .values({
          title: title.trim(),
          parentId: parentId ?? null,
          description: description ?? null,
          assignee: assignee ?? null,
          status: finalStatus,
          progress: finalProgress,
          startDate: startDate ?? null,
          dueDate: dueDate ?? null,
        })
        .returning()

      return { content: [{ type: 'text', text: JSON.stringify(task) }] }
    }
  )

  server.registerTool(
    'update_task',
    {
      description:
        '작업을 부분 수정합니다. 지정하지 않은 필드는 유지됩니다. 진행률 100이면 상태가 자동으로 done이 됩니다. null을 전달하면 해당 필드를 비웁니다.',
      inputSchema: updateTaskSchema,
    },
    async (input) => {
      const { id, title, description, assignee, status, progress, startDate, dueDate, parentId } = input

      const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
      if (!existing) {
        return { content: [{ type: 'text', text: '작업을 찾을 수 없습니다.' }], isError: true }
      }

      const resolvedStart = startDate !== undefined ? startDate : existing.startDate
      const resolvedDue = dueDate !== undefined ? dueDate : existing.dueDate
      if (resolvedStart && resolvedDue && resolvedDue < resolvedStart) {
        return {
          content: [{ type: 'text', text: '목표 기한(dueDate)은 시작일(startDate) 이후여야 합니다.' }],
          isError: true,
        }
      }

      const data: Record<string, unknown> = { updatedAt: new Date() }

      if (title !== undefined) data.title = title.trim()
      if (parentId !== undefined) data.parentId = parentId
      if (description !== undefined) data.description = description
      if (assignee !== undefined) data.assignee = assignee
      if (startDate !== undefined) data.startDate = startDate
      if (dueDate !== undefined) data.dueDate = dueDate

      if (progress !== undefined) {
        data.progress = progress
        // 진행률 100 → 상태 강제 done (역방향 자동 동기화 없음)
        data.status = progress === 100 ? 'done' : (status ?? existing.status)
      } else if (status !== undefined) {
        data.status = status
      }

      const [updated] = await db
        .update(tasks)
        .set(data as Parameters<ReturnType<typeof db.update>['set']>[0])
        .where(eq(tasks.id, id))
        .returning()

      return { content: [{ type: 'text', text: JSON.stringify(updated) }] }
    }
  )

  server.registerTool(
    'delete_task',
    {
      description: '작업을 삭제합니다. 하위 작업도 cascade로 함께 삭제됩니다.',
      inputSchema: z.object({ id: z.string().uuid() }),
    },
    async ({ id }) => {
      const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
      if (!existing) {
        return { content: [{ type: 'text', text: '작업을 찾을 수 없습니다.' }], isError: true }
      }

      await db.delete(tasks).where(eq(tasks.id, id))
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, id }) }] }
    }
  )

  return server
}

// ---------- 요청 핸들러 ----------

async function handleMcp(req: NextRequest): Promise<Response> {
  // stateless: 요청마다 transport + server를 새로 생성
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = buildServer()
  await server.connect(transport)
  return transport.handleRequest(req)
}

export async function POST(req: NextRequest) {
  const guardErr = guardEnabled()
  if (guardErr) return guardErr
  const versionErr = checkProtocolVersion(req)
  if (versionErr) return versionErr
  return handleMcp(req)
}

export async function GET(req: NextRequest) {
  const guardErr = guardEnabled()
  if (guardErr) return guardErr
  const versionErr = checkProtocolVersion(req)
  if (versionErr) return versionErr
  return handleMcp(req)
}

export async function DELETE(req: NextRequest) {
  const guardErr = guardEnabled()
  if (guardErr) return guardErr
  const versionErr = checkProtocolVersion(req)
  if (versionErr) return versionErr
  return handleMcp(req)
}
