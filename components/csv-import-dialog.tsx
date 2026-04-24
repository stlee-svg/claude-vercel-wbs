'use client'

import { useState, useRef } from 'react'
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { parseImportPreview, type ImportPreview } from '@/lib/utils/csv'
import type { Task } from '@/lib/types'

interface CsvImportDialogProps {
  open: boolean
  existingTasks: Task[]
  onClose: () => void
  onImportComplete: () => void
}

export function CsvImportDialog({
  open,
  existingTasks,
  onClose,
  onImportComplete,
}: CsvImportDialogProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const result = parseImportPreview(text, existingTasks)
        setPreview(result)
        setParseError('')
      } catch {
        setParseError('CSV 파싱에 실패했습니다.')
        setPreview(null)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleApply = async () => {
    if (!preview) return
    setLoading(true)

    // 같은 배치에서 생성된 task: title → id 누적
    const createdByTitle = new Map<string, string>()

    const validRows = preview.rows.filter((r) => r.status !== 'excluded' && r.data)

    for (const row of validRows) {
      const d = row.data!

      let parentId: string | null = null
      if (d.parentTitle) {
        parentId =
          existingTasks.find((t) => t.title === d.parentTitle)?.id ??
          createdByTitle.get(d.parentTitle) ??
          null
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: d.title,
          description: d.description,
          assignee: d.assignee,
          status: d.status,
          progress: d.progress,
          startDate: d.startDate,
          dueDate: d.dueDate,
          parentId,
        }),
      })

      if (res.ok) {
        const created: Task = await res.json()
        createdByTitle.set(created.title, created.id)
      }
    }

    setLoading(false)
    handleClose()
    onImportComplete()
  }

  const handleClose = () => {
    setPreview(null)
    setParseError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const warningRows = preview?.rows.filter((r) => r.status !== 'valid') ?? []

  return (
    <Dialog.Root open={open} onOpenChange={({ open: isOpen }) => !isOpen && handleClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="520px" w="full">
          <Dialog.Header>
            <Dialog.Title>CSV 불러오기</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  헤더: 제목, 설명, 담당자, 상태, 진행률, 시작일, 목표 기한, 상위 작업 제목
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ width: '100%' }}
                />
              </Box>

              {parseError && (
                <Text color="red.500" fontSize="sm">{parseError}</Text>
              )}

              {preview && (
                <VStack gap={3} align="stretch">
                  <Text fontWeight="semibold" fontSize="sm">
                    {preview.validCount}개 작업을 추가합니다.{' '}
                    {preview.excludedCount > 0 && (
                      <Text as="span" color="red.500">제외 {preview.excludedCount}건</Text>
                    )}
                  </Text>

                  {warningRows.length > 0 && (
                    <Box
                      maxH="180px"
                      overflowY="auto"
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="md"
                      p={3}
                    >
                      <VStack gap={1} align="stretch">
                        {warningRows.map((row) => (
                          <Text
                            key={row.rowIndex}
                            fontSize="xs"
                            color={row.status === 'excluded' ? 'red.500' : 'orange.600'}
                          >
                            {row.rowIndex}행 ({row.status === 'excluded' ? '제외' : '경고'}): {row.message}
                          </Text>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              )}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="ghost" onClick={handleClose}>
                취소
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleApply}
                loading={loading}
                disabled={!preview || preview.validCount === 0}
              >
                적용
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
