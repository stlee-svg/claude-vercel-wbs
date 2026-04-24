import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 재귀 CTE로 손자 이하까지 포함한 전체 하위 수 조회
    const rows = await db.execute(sql`
      WITH RECURSIVE descendants AS (
        SELECT id FROM tasks WHERE parent_id = ${id}
        UNION ALL
        SELECT t.id FROM tasks t
        INNER JOIN descendants d ON t.parent_id = d.id
      )
      SELECT COUNT(*)::int AS count FROM descendants
    `)

    const count = Number((rows as unknown as Array<{ count: number }>)[0]?.count ?? 0)

    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
