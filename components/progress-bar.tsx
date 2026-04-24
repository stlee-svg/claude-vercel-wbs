import { Box, Flex, Text } from '@chakra-ui/react'

interface ProgressBarProps {
  progress: number
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <Flex align="center" gap={2} minW="90px">
      <Box flex="1" h="6px" bg="gray.100" borderRadius="full" overflow="hidden">
        <Box
          h="100%"
          w={`${progress}%`}
          bg={progress === 100 ? 'green.400' : 'blue.400'}
          borderRadius="full"
          transition="width 0.2s"
        />
      </Box>
      <Text fontSize="xs" color="gray.600" minW="32px" textAlign="right">
        {progress}%
      </Text>
    </Flex>
  )
}
