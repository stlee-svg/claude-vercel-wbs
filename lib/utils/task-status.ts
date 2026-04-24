import type { TaskStatus } from '@/lib/types'

const STATUS_CYCLE: TaskStatus[] = ['todo', 'doing', 'done']

export function cycleStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_CYCLE.indexOf(current)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}
