'use client'

import { useState, useEffect } from 'react'
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  HStack,
  Input,
  NativeSelect,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import type { Task } from '@/lib/types'

interface TaskFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: Task
  parentId?: string | null
  onClose: () => void
  onSuccess: (task: Task) => void
}

export function TaskFormModal({
  open,
  mode,
  initialData,
  parentId,
  onClose,
  onSuccess,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [status, setStatus] = useState('todo')
  const [progress, setProgress] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? '')
      setDescription(initialData?.description ?? '')
      setAssignee(initialData?.assignee ?? '')
      setStatus(initialData?.status ?? 'todo')
      setProgress(initialData?.progress ?? 0)
      setStartDate(initialData?.startDate ?? '')
      setDueDate(initialData?.dueDate ?? '')
      setDateError('')
      setServerError('')
    }
  }, [open, initialData])

  const handleProgressChange = (val: number) => {
    const clamped = Math.min(100, Math.max(0, val))
    setProgress(clamped)
    if (clamped === 100) setStatus('done')
  }

  const handleSave = async () => {
    if (startDate && dueDate && dueDate < startDate) {
      setDateError('목표 기한은 시작일 이후여야 합니다.')
      return
    }
    setDateError('')
    setServerError('')
    setLoading(true)

    try {
      const body = {
        title,
        description: description || null,
        assignee: assignee || null,
        status,
        progress,
        startDate: startDate || null,
        dueDate: dueDate || null,
        ...(mode === 'create' ? { parentId: parentId ?? null } : {}),
      }

      const url = mode === 'create' ? '/api/tasks' : `/api/tasks/${initialData!.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? '저장에 실패했습니다.')
        return
      }

      const saved: Task = await res.json()
      onSuccess(saved)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={({ open: isOpen }) => !isOpen && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="500px" w="full">
          <Dialog.Header>
            <Dialog.Title>{mode === 'create' ? '작업 추가' : '작업 수정'}</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              {serverError && (
                <Field.Root invalid>
                  <Field.ErrorText>{serverError}</Field.ErrorText>
                </Field.Root>
              )}

              <Field.Root required>
                <Field.Label>제목</Field.Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="작업 제목을 입력하세요"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>설명</Field.Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명 (선택)"
                  rows={3}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>담당자</Field.Label>
                <Input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="담당자 이름 (선택)"
                />
              </Field.Root>

              <HStack gap={4} align="flex-start">
                <Field.Root flex={1}>
                  <Field.Label>상태</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="todo">할 일</option>
                      <option value="doing">진행 중</option>
                      <option value="done">완료</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root flex={1}>
                  <Field.Label>진행률 (0–100)</Field.Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => handleProgressChange(Number(e.target.value))}
                  />
                </Field.Root>
              </HStack>

              <HStack gap={4} align="flex-start">
                <Field.Root flex={1}>
                  <Field.Label>시작일</Field.Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setDateError('')
                    }}
                  />
                </Field.Root>

                <Field.Root flex={1} invalid={!!dateError}>
                  <Field.Label>목표 기한</Field.Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value)
                      setDateError('')
                    }}
                  />
                  {dateError && <Field.ErrorText>{dateError}</Field.ErrorText>}
                </Field.Root>
              </HStack>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button
                colorPalette="blue"
                onClick={handleSave}
                loading={loading}
                disabled={!title.trim()}
              >
                저장
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
