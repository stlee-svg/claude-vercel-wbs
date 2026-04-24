import type { Task } from '@/lib/types'

export const CELL_WIDTH = 80          // px / week
export const DAY_WIDTH = CELL_WIDTH / 7  // px / day

// ─── 내부 날짜 유틸 ────────────────────────────────────────────────────────────

function diffDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)  // 로컬 자정
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface WeekCell {
  startDate: Date
  label: string          // "5/1"
  isMonthStart: boolean
  monthLabel?: string    // "5월"
}

export interface GanttRange {
  start: Date
  totalDays: number
  totalWidth: number     // px
  weeks: WeekCell[]
}

export interface BarPos {
  left: number           // px
  width: number          // px
  hasBar: boolean
}

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

export function calcGanttRange(tasks: Task[]): GanttRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dates: Date[] = []
  for (const t of tasks) {
    if (t.startDate) dates.push(parseLocalDate(t.startDate))
    if (t.dueDate) dates.push(parseLocalDate(t.dueDate))
  }

  let minDate = dates.length > 0
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : today
  let maxDate = dates.length > 0
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : today

  // 양쪽 1주 패딩
  minDate = addDays(minDate, -7)
  maxDate = addDays(maxDate, 7)

  // 최소 8주 보장
  if (diffDays(minDate, maxDate) < 56) {
    maxDate = addDays(minDate, 56)
  }

  const start = toMonday(minDate)
  const end = addDays(toMonday(maxDate), 7)  // 마지막 주 끝까지

  const totalDays = diffDays(start, end)

  // 주 셀 생성
  const weeks: WeekCell[] = []
  let cur = new Date(start)
  let prevMonth = -1

  while (cur < end) {
    const isMonthStart = cur.getMonth() !== prevMonth
    weeks.push({
      startDate: new Date(cur),
      label: `${cur.getMonth() + 1}/${cur.getDate()}`,
      isMonthStart,
      monthLabel: isMonthStart ? `${cur.getMonth() + 1}월` : undefined,
    })
    prevMonth = cur.getMonth()
    cur = addDays(cur, 7)
  }

  return { start, totalDays, totalWidth: totalDays * DAY_WIDTH, weeks }
}

export function calcBarPos(task: Task, range: GanttRange): BarPos {
  if (!task.startDate || !task.dueDate) {
    return { left: 0, width: 0, hasBar: false }
  }
  const taskStart = parseLocalDate(task.startDate)
  const taskEnd = parseLocalDate(task.dueDate)
  const left = diffDays(range.start, taskStart) * DAY_WIDTH
  const width = Math.max((diffDays(taskStart, taskEnd) + 1) * DAY_WIDTH, DAY_WIDTH)
  return { left, width, hasBar: true }
}

export function calcTodayLeft(range: GanttRange, today: Date): number | null {
  const left = diffDays(range.start, today) * DAY_WIDTH
  if (left < 0 || left > range.totalWidth) return null
  return left
}

export function isOverdue(task: Task, today: Date): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return parseLocalDate(task.dueDate) < today
}
