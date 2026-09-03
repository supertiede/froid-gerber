import { BottomNav } from '@/components/layout/BottomNav'
import { OfflineBanner } from '@/components/layout/OfflineBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      <main style={{ paddingBottom: 80, minHeight: '100vh', background: 'var(--fond)' }}>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
