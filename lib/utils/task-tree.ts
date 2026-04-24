import type { Task } from '@/lib/types'

export interface FlatNode {
  task: Task
  depth: number
  hasChildren: boolean
}

export function buildFlatTree(tasks: Task[], collapsed: Set<string>): FlatNode[] {
  const childrenMap = new Map<string | null, Task[]>()

  for (const task of tasks) {
    const key = task.parentId ?? null
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(task)
  }

  const result: FlatNode[] = []

  function traverse(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId) ?? []
    for (const task of children) {
      const taskChildren = childrenMap.get(task.id) ?? []
      result.push({ task, depth, hasChildren: taskChildren.length > 0 })
      if (!collapsed.has(task.id)) {
        traverse(task.id, depth + 1)
      }
    }
  }

  traverse(null, 0)
  return result
}
