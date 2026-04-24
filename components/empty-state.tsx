import { Box, Button, Text, VStack } from '@chakra-ui/react'

interface EmptyStateProps {
  onAddTask: () => void
}

export function EmptyState({ onAddTask }: EmptyStateProps) {
  return (
    <Box py={16} textAlign="center">
      <VStack gap={4}>
        <Text fontSize="lg" color="gray.500">
          아직 작업이 없습니다.
        </Text>
        <Text fontSize="sm" color="gray.400">
          첫 작업을 추가해 시작하세요.
        </Text>
        <Button onClick={onAddTask} colorPalette="blue" size="sm">
          + 작업 추가
        </Button>
      </VStack>
    </Box>
  )
}
