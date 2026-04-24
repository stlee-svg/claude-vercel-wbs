'use client'

import { Badge } from '@chakra-ui/react'
import type { TaskStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: TaskStatus
  onCycleStatus: () => void
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; colorPalette: string }> = {
  todo: { label: '할 일', colorPalette: 'gray' },
  doing: { label: '진행 중', colorPalette: 'blue' },
  done: { label: '완료', colorPalette: 'green' },
}

export function StatusBadge({ status, onCycleStatus }: StatusBadgeProps) {
  const { label, colorPalette } = STATUS_CONFIG[status]

  return (
    <Badge
      colorPalette={colorPalette}
      cursor="pointer"
      userSelect="none"
      onClick={(e) => {
        e.stopPropagation()
        onCycleStatus()
      }}
    >
      {label}
    </Badge>
  )
}
