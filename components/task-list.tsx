'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { TaskRow } from '@/components/task-row'
import { TaskFormModal } from '@/components/task-form-modal'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { buildFlatTree } from '@/lib/utils/task-tree'
import type { Task, TaskStatus } from '@/lib/types'

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; childCount: number } | null>(null)

  const flatNodes = useMemo(() => buildFlatTree(tasks, collapsed), [tasks, collapsed])

  const handleToggle = useCallback((taskId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }, [])

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(data.tasks ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleAddTask = () => {
    setCreateParentId(null)
    setCreateModalOpen(true)
  }

  const handleAddChild = (parentId: string) => {
    setCreateParentId(parentId)
    setCreateModalOpen(true)
  }

  const handleCreateSuccess = (task: Task) => {
    setTasks((prev) => [...prev, task])
  }

  const handleEditSuccess = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setEditingTask(null)
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const updated: Task = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    }
  }

  const handleDeleteRequest = async (taskId: string) => {
    const res = await fetch(`/api/tasks/${taskId}/children`)
    const { count } = await res.json()
    setDeleteTarget({ id: taskId, childCount: count })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await fetch(`/api/tasks/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    fetchTasks()
  }

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.400">불러오는 중...</Text>
      </Box>
    )
  }

  return (
    <Box borderRadius="lg" border="1px solid" borderColor="gray.200" overflow="hidden">
      {/* 헤더 */}
      <Flex
        justify="space-between"
        align="center"
        px={4}
        py={4}
        borderBottom="2px solid"
        borderColor="gray.200"
        bg="white"
      >
        <Text fontWeight="bold" fontSize="lg">
          WBS 작업 목록
        </Text>
        <Button colorPalette="blue" size="sm" onClick={handleAddTask}>
          + 작업 추가
        </Button>
      </Flex>

      {/* 컬럼 헤더 */}
      {tasks.length > 0 && (
        <Flex px={4} py={2} bg="gray.50" borderBottom="1px solid" borderColor="gray.200" gap={4}>
          <Box flex="1">
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">제목 / 담당자</Text>
          </Box>
          <Box w="80px">
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">상태</Text>
          </Box>
          <Box w="110px">
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">진행률</Text>
          </Box>
          <Box w="170px">
            <Text fontSize="xs" fontWeight="semibold" color="gray.500">기간</Text>
          </Box>
          <Box w="40px" />
        </Flex>
      )}

      {/* 목록 or 빈 상태 */}
      {tasks.length === 0 ? (
        <EmptyState onAddTask={handleAddTask} />
      ) : (
        flatNodes.map(({ task, depth, hasChildren }) => (
          <TaskRow
            key={task.id}
            task={task}
            depth={depth}
            hasChildren={hasChildren}
            isExpanded={!collapsed.has(task.id)}
            onToggle={handleToggle}
            onEdit={setEditingTask}
            onAddChild={handleAddChild}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
          />
        ))
      )}

      {/* 생성 모달 */}
      <TaskFormModal
        open={createModalOpen}
        mode="create"
        parentId={createParentId}
        onClose={() => {
          setCreateModalOpen(false)
          setCreateParentId(null)
        }}
        onSuccess={handleCreateSuccess}
      />

      {/* 수정 모달 */}
      <TaskFormModal
        open={!!editingTask}
        mode="edit"
        initialData={editingTask ?? undefined}
        onClose={() => setEditingTask(null)}
        onSuccess={handleEditSuccess}
      />

      {/* 삭제 확인 */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        childCount={deleteTarget?.childCount ?? 0}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  )
}
