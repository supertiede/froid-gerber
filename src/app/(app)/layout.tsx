import { BottomNav } from '@/components/layout/BottomNav'
import { BandeauHorsLigne } from '@/components/layout/BandeauHorsLigne'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BandeauHorsLigne />
      <main style={{ paddingBottom: 80, minHeight: '100vh', background: 'var(--fond)' }}>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
