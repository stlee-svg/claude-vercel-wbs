import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { title, parentId, description, assignee, status, progress, startDate, dueDate } = body

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!existing) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 })
    }

    const resolvedStartDate = startDate !== undefined ? startDate : existing.startDate
    const resolvedDueDate = dueDate !== undefined ? dueDate : existing.dueDate
    if (resolvedStartDate && resolvedDueDate && resolvedDueDate < resolvedStartDate) {
      return NextResponse.json(
        { error: '목표 기한은 시작일 이후여야 합니다.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (title !== undefined) updateData.title = title.trim()
    if (parentId !== undefined) updateData.parentId = parentId
    if (description !== undefined) updateData.description = description
    if (assignee !== undefined) updateData.assignee = assignee
    if (startDate !== undefined) updateData.startDate = startDate
    if (dueDate !== undefined) updateData.dueDate = dueDate

    if (progress !== undefined) {
      updateData.progress = progress
      // progress 100 → status 강제 'done'
      updateData.status = progress === 100 ? 'done' : (status ?? existing.status)
    } else if (status !== undefined) {
      updateData.status = status
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData as Parameters<ReturnType<typeof db.update>['set']>[0])
      .where(eq(tasks.id, id))
      .returning()

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!existing) {
      return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 })
    }

    await db.delete(tasks).where(eq(tasks.id, id))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
