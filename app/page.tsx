import { TaskList } from '@/components/task-list'

export default function Home() {
  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px' }}>
      <TaskList />
    </main>
  )
}
