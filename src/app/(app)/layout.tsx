import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main style={{ paddingBottom: 80, minHeight: '100vh', background: 'var(--fond)' }}>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
