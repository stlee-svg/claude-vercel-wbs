import type { Task } from '@/lib/types'
import { buildFlatTree } from '@/lib/utils/task-tree'

// ─── 상수 ────────────────────────────────────────────────────────────────────

const CSV_HEADERS = ['제목', '설명', '담당자', '상태', '진행률', '시작일', '목표 기한', '상위 작업 제목']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const STATUS_TO_CSV: Record<string, string> = {
  todo: '할 일', doing: '진행 중', done: '완료',
}
const STATUS_TO_DB: Record<string, string> = {
  '할 일': 'todo', '진행 중': 'doing', '완료': 'done',
}

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface CsvRowData {
  title: string
  description: string | null
  assignee: string | null
  status: string
  progress: number
  startDate: string | null
  dueDate: string | null
  parentTitle: string | null
}

export interface ImportPreviewRow {
  rowIndex: number
  status: 'valid' | 'excluded' | 'warning'
  message?: string
  data?: CsvRowData
}

export interface ImportPreview {
  validCount: number
  excludedCount: number
  rows: ImportPreviewRow[]
}

// ─── Export ───────────────────────────────────────────────────────────────────

function escapeField(v: string): string {
  if (/[,"\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

export function exportTasksToCsv(tasks: Task[]): string {
  const flatNodes = buildFlatTree(tasks, new Set())
  const idToTitle = new Map(tasks.map((t) => [t.id, t.title]))

  const lines: string[] = [CSV_HEADERS.join(',')]

  for (const { task } of flatNodes) {
    const parentTitle = task.parentId ? (idToTitle.get(task.parentId) ?? '') : ''
    lines.push(
      [
        task.title,
        task.description ?? '',
        task.assignee ?? '',
        STATUS_TO_CSV[task.status] ?? '할 일',
        String(task.progress),
        task.startDate ?? '',
        task.dueDate ?? '',
        parentTitle,
      ]
        .map(escapeField)
        .join(',')
    )
  }

  return lines.join('\n')
}

// ─── CSV 파서 (RFC 4180) ──────────────────────────────────────────────────────

function parseCsvRows(text: string): string[][] {
  const s = text.startsWith('﻿') ? text.slice(1) : text
  const result: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < s.length) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i += 2 }
      else if (ch === '"') { inQuotes = false; i++ }
      else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuotes = true; i++ }
      else if (ch === ',') { row.push(field); field = ''; i++ }
      else if (ch === '\r' && s[i + 1] === '\n') {
        row.push(field); result.push(row); row = []; field = ''; i += 2
      } else if (ch === '\n') {
        row.push(field); result.push(row); row = []; field = ''; i++
      } else { field += ch; i++ }
    }
  }

  if (field || row.length > 0) {
    row.push(field)
    if (row.some((f) => f !== '')) result.push(row)
  }

  return result
}

// ─── Import 미리보기 ──────────────────────────────────────────────────────────

export function parseImportPreview(csvText: string, existingTasks: Task[]): ImportPreview {
  const allRows = parseCsvRows(csvText)
  if (allRows.length <= 1) return { validCount: 0, excludedCount: 0, rows: [] }

  const dataRows = allRows.slice(1)
  const existingTitles = new Set(existingTasks.map((t) => t.title))
  const csvTitlesSoFar = new Set<string>()

  const rows: ImportPreviewRow[] = []
  let validCount = 0
  let excludedCount = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const rowIndex = i + 2 // 헤더=1행, 데이터 시작=2행

    const [
      titleRaw = '',
      descRaw = '',
      assigneeRaw = '',
      statusRaw = '',
      progressRaw = '',
      startDateRaw = '',
      dueDateRaw = '',
      parentTitleRaw = '',
    ] = row

    const title = titleRaw.trim()

    if (!title) {
      rows.push({ rowIndex, status: 'excluded', message: '제목 누락' })
      excludedCount++
      continue
    }

    const warnings: string[] = []

    // 상태
    const statusKey = statusRaw.trim()
    let status = STATUS_TO_DB[statusKey]
    if (!status) {
      status = 'todo'
      if (statusKey) warnings.push(`상태 "${statusKey}" 인식 불가 → '할 일'로 대체`)
    }

    // 진행률
    const progress = Math.min(100, Math.max(0, parseInt(progressRaw, 10) || 0))

    // 날짜
    let startDate: string | null = startDateRaw.trim() || null
    let dueDate: string | null = dueDateRaw.trim() || null
    if (startDate && !DATE_RE.test(startDate)) {
      warnings.push(`시작일 형식 불량(${startDate}) → 무시`)
      startDate = null
    }
    if (dueDate && !DATE_RE.test(dueDate)) {
      warnings.push(`목표 기한 형식 불량(${dueDate}) → 무시`)
      dueDate = null
    }

    // 상위 작업
    const parentTitle = parentTitleRaw.trim() || null
    if (parentTitle && !existingTitles.has(parentTitle) && !csvTitlesSoFar.has(parentTitle)) {
      warnings.push(`상위 작업 "${parentTitle}" 미매칭 → 최상위로 처리`)
    }

    csvTitlesSoFar.add(title)
    validCount++

    rows.push({
      rowIndex,
      status: warnings.length > 0 ? 'warning' : 'valid',
      message: warnings.length > 0 ? warnings.join(' / ') : undefined,
      data: {
        title,
        description: descRaw.trim() || null,
        assignee: assigneeRaw.trim() || null,
        status,
        progress,
        startDate,
        dueDate,
        parentTitle,
      },
    })
  }

  return { validCount, excludedCount, rows }
}
