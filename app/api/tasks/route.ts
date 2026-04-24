import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'

export async function GET() {
  try {
    const result = await db.select().from(tasks).orderBy(asc(tasks.createdAt))
    return NextResponse.json({ tasks: result })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, parentId, description, assignee, status, progress, startDate, dueDate } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: '제목은 필수입니다.' }, { status: 400 })
    }

    if (startDate && dueDate && dueDate < startDate) {
      return NextResponse.json(
        { error: '목표 기한은 시작일 이후여야 합니다.' },
        { status: 400 }
      )
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

    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
