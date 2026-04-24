import { Button, CloseButton, Dialog, HStack, Text } from '@chakra-ui/react'

interface DeleteConfirmDialogProps {
  open: boolean
  childCount: number
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  open,
  childCount,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const message =
    childCount === 0
      ? '이 작업을 삭제합니다. 계속할까요?'
      : `이 작업과 하위 작업 ${childCount}개가 모두 삭제됩니다. 계속할까요?`

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose()}
      role="alertdialog"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="400px">
          <Dialog.Header>
            <Dialog.Title>작업 삭제</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <Dialog.Body>
            <Text>{message}</Text>
          </Dialog.Body>
          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button colorPalette="red" onClick={onConfirm}>
                삭제
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
