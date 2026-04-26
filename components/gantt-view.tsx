'use client'

import { useMemo } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { GanttBar } from '@/components/gantt-bar'
import { buildFlatTree } from '@/lib/utils/task-tree'
import { calcGanttRange, calcTodayLeft, CELL_WIDTH } from '@/lib/utils/gantt'
import type { Task } from '@/lib/types'

const LEFT_WIDTH = 240   // px — 좌측 고정 트리 폭
const ROW_HEIGHT = 40    // px — 행 높이

interface GanttViewProps {
  tasks: Task[]
  collapsed: Set<string>
  onToggle: (taskId: string) => void
  onEdit: (task: Task) => void
}

export function GanttView({ tasks, collapsed, onToggle, onEdit }: GanttViewProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const flatNodes = useMemo(() => buildFlatTree(tasks, collapsed), [tasks, collapsed])
  const range = useMemo(() => calcGanttRange(tasks), [tasks])
  const todayLeft = useMemo(() => calcTodayLeft(range, today), [range, today])

  const minW = LEFT_WIDTH + range.totalWidth

  return (
    <Box maxH="70vh" overflow="auto" position="relative">
      {/* ── 헤더 행 (sticky top) ────────────────────────────── */}
      <Flex
        position="sticky"
        top={0}
        zIndex={10}
        bg="gray.50"
        borderBottom="2px solid"
        borderColor="gray.200"
        minW={`${minW}px`}
      >
        {/* 좌측 헤더 (sticky left) */}
        <Box
          w={`${LEFT_WIDTH}px`}
          flexShrink={0}
          h={`${ROW_HEIGHT}px`}
          position="sticky"
          left={0}
          zIndex={11}
          bg="gray.50"
          borderRight="1px solid"
          borderColor="gray.200"
          display="flex"
          alignItems="center"
          px={4}
        >
          <Text fontSize="xs" fontWeight="semibold" color="gray.500">제목</Text>
        </Box>

        {/* 주 단위 날짜 헤더 */}
        <Flex flexShrink={0}>
          {range.weeks.map((week, i) => (
            <Box
              key={i}
              w={`${CELL_WIDTH}px`}
              flexShrink={0}
              h={`${ROW_HEIGHT}px`}
              borderLeft="1px solid"
              borderColor="gray.200"
              px={1}
              pt="2px"
            >
              {week.isMonthStart && (
                <Text fontSize="9px" color="gray.400" lineHeight={1}>
                  {week.monthLabel}
                </Text>
              )}
              <Text fontSize="xs" color="gray.600">{week.label}</Text>
            </Box>
          ))}
        </Flex>
      </Flex>

      {/* ── 데이터 영역 ──────────────────────────────────────── */}
      <Box position="relative" minW={`${minW}px`}>
        {/* 오늘 강조선 */}
        {todayLeft !== null && (
          <Box
            position="absolute"
            top={0}
            bottom={0}
            left={`${LEFT_WIDTH + todayLeft}px`}
            w="1px"
            bg="red.400"
            zIndex={2}
            pointerEvents="none"
          />
        )}

        {flatNodes.length === 0 ? (
          <Box h="80px" display="flex" alignItems="center" justifyContent="center">
            <Text fontSize="sm" color="gray.400">작업이 없습니다.</Text>
          </Box>
        ) : (
          flatNodes.map(({ task, depth, hasChildren }) => {
            const isExpanded = !collapsed.has(task.id)
            return (
              <Flex
                key={task.id}
                h={`${ROW_HEIGHT}px`}
                borderBottom="1px solid"
                borderColor="gray.100"
                _hover={{ bg: 'gray.50' }}
              >
                {/* 좌측 트리 셀 (sticky left) */}
                <Flex
                  w={`${LEFT_WIDTH}px`}
                  flexShrink={0}
                  h="100%"
                  align="center"
                  position="sticky"
                  left={0}
                  zIndex={3}
                  bg="white"
                  borderRight="1px solid"
                  borderColor="gray.200"
                  style={{ paddingLeft: `${12 + depth * 20}px` }}
                  gap={1}
                >
                  {/* ▼/▶ 아이콘 */}
                  <Box
                    w="14px"
                    flexShrink={0}
                    fontSize="9px"
                    color="gray.400"
                    cursor={hasChildren ? 'pointer' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (hasChildren) onToggle(task.id)
                    }}
                    textAlign="center"
                  >
                    {hasChildren ? (isExpanded ? '▼' : '▶') : null}
                  </Box>
                  <Text
                    fontSize="sm"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    flex={1}
                  >
                    {task.title}
                  </Text>
                </Flex>

                {/* 우측 막대 셀 */}
                <Box
                  flexShrink={0}
                  w={`${range.totalWidth}px`}
                  h="100%"
                  position="relative"
                >
                  <GanttBar task={task} range={range} today={today} />
                </Box>
              </Flex>
            )
          })
        )}
      </Box>
    </Box>
  )
}
