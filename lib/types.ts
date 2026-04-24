export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task {
  id: string
  parentId: string | null
  title: string
  description: string | null
  assignee: string | null
  status: TaskStatus
  progress: number
  startDate: string | null  // 'YYYY-MM-DD'
  dueDate: string | null    // 'YYYY-MM-DD'
  createdAt: string
  updatedAt: string
}
