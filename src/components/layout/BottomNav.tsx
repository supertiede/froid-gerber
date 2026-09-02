'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Wrench, CalendarRange } from 'lucide-react'

const TABS = [
  { href: '/',              Icon: CalendarDays,  label: 'Journée' },
  { href: '/interventions', Icon: Wrench,         label: 'Interventions' },
  { href: '/semaine',       Icon: CalendarRange,  label: 'Ma semaine' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      borderTop: '1px solid var(--trait)',
      background: 'var(--surface)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      height: 64,
      zIndex: 40,
    }}>
      {TABS.map(({ href, Icon, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              textDecoration: 'none',
              color: active ? 'var(--acier)' : 'var(--encre-douce)',
              fontSize: 12,
              fontWeight: 500,
              minHeight: 64,
            }}
          >
            <Icon size={24} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
