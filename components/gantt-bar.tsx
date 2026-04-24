import { Box, Text } from '@chakra-ui/react'
import { calcBarPos, isOverdue, type GanttRange } from '@/lib/utils/gantt'
import type { Task } from '@/lib/types'

interface GanttBarProps {
  task: Task
  range: GanttRange
  today: Date
}

export function GanttBar({ task, range, today }: GanttBarProps) {
  const barPos = calcBarPos(task, range)
  const overdue = isOverdue(task, today)

  if (!barPos.hasBar) {
    return (
      <Box h="40px" display="flex" alignItems="center" px={2}>
        <Text fontSize="xs" color="gray.400">— 일정 없음 —</Text>
      </Box>
    )
  }

  return (
    <Box
      position="absolute"
      top="50%"
      style={{
        left: `${barPos.left}px`,
        width: `${barPos.width}px`,
        transform: 'translateY(-50%)',
      }}
      h="22px"
      borderRadius="sm"
      overflow="hidden"
      bg="blue.100"
      border={overdue ? '2px solid' : 'none'}
      borderColor={overdue ? 'red.400' : 'transparent'}
    >
      <Box h="100%" w={`${task.progress}%`} bg="blue.500" />
    </Box>
  )
}
