import { Badge, Box, Flex, IconButton, Menu, Text } from '@chakra-ui/react'
import { StatusBadge } from '@/components/status-badge'
import { ProgressBar } from '@/components/progress-bar'
import { cycleStatus } from '@/lib/utils/task-status'
import { isOverdue } from '@/lib/utils/gantt'
import type { Task, TaskStatus } from '@/lib/types'

interface TaskRowProps {
  task: Task
  depth: number
  hasChildren: boolean
  isExpanded: boolean
  today: Date
  onToggle: (taskId: string) => void
  onEdit: (task: Task) => void
  onAddChild: (parentId: string) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskRow({
  task,
  depth,
  hasChildren,
  isExpanded,
  today,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
  onStatusChange,
}: TaskRowProps) {
  return (
    <Flex
      align="center"
      style={{ paddingLeft: `${16 + depth * 24}px` }}
      pr={4}
      py={3}
      borderBottom="1px solid"
      borderColor="gray.100"
      gap={4}
      _hover={{ bg: 'gray.50', cursor: 'pointer' }}
      onClick={() => onEdit(task)}
    >
      {/* ▼/▶ 펼침/접힘 아이콘 */}
      <Box
        w="18px"
        flexShrink={0}
        fontSize="10px"
        color="gray.400"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor={hasChildren ? 'pointer' : 'default'}
        onClick={(e) => {
          e.stopPropagation()
          if (hasChildren) onToggle(task.id)
        }}
      >
        {hasChildren ? (isExpanded ? '▼' : '▶') : null}
      </Box>

      {/* 제목 / 담당자 */}
      <Box flex="1" minW={0}>
        <Text fontSize="sm" fontWeight="medium" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {task.title}
        </Text>
        {task.assignee && (
          <Text fontSize="xs" color="gray.500">
            {task.assignee}
          </Text>
        )}
      </Box>

      {/* 상태 배지 */}
      <Box w="80px" flexShrink={0}>
        <StatusBadge
          status={task.status as TaskStatus}
          onCycleStatus={() =>
            onStatusChange(task.id, cycleStatus(task.status as TaskStatus))
          }
        />
      </Box>

      {/* 진행률 */}
      <Box w="110px" flexShrink={0}>
        <ProgressBar progress={task.progress} />
      </Box>

      {/* 기간 */}
      <Box w="170px" flexShrink={0}>
        {(() => {
          const overdue = isOverdue(task, today)
          const dateText = task.startDate && task.dueDate
            ? `${task.startDate} ~ ${task.dueDate}`
            : task.startDate || task.dueDate || '-'
          return (
            <Flex align="center" gap={1}>
              <Text fontSize="xs" color={overdue ? 'red.500' : 'gray.500'}>
                {dateText}
              </Text>
              {overdue && (
                <Badge colorPalette="red" size="sm">지남</Badge>
              )}
            </Flex>
          )
        })()}
      </Box>

      {/* ⋯ 메뉴 */}
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="옵션"
            variant="ghost"
            size="sm"
            flexShrink={0}
            onClick={(e) => e.stopPropagation()}
          >
            ⋯
          </IconButton>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.Item
              value="add-child"
              onClick={(e) => {
                e.stopPropagation()
                onAddChild(task.id)
              }}
            >
              하위 작업 추가
            </Menu.Item>
            <Menu.Item
              value="delete"
              color="red.500"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(task.id)
              }}
            >
              삭제
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>
    </Flex>
  )
}
