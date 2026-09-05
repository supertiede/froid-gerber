'use client'

import { LogIn, LogOut, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { EtatJournee } from '@/lib/etat-journee'

type Props = {
  status: EtatJournee
  loading: boolean
  onStart: () => void
  onEnd: () => void
  onResume: () => void
}

type Config = { label: string; icon: React.ReactNode; color: string; onClick: () => void }

export function DayShiftButton({ status, loading, onStart, onEnd, onResume }: Props) {
  const config: Config = (() => {
    switch (status) {
      case 'HORS_POSTE':
        return { label: 'Arrivée', icon: <LogIn size={22} />, color: 'var(--vert)', onClick: onStart }
      case 'JOURNEE_TERMINEE':
        return { label: 'Reprendre le travail', icon: <Play size={22} />, color: 'var(--vert)', onClick: onResume }
      default:
        return { label: 'Fin de journée', icon: <LogOut size={22} />, color: 'var(--encre)', onClick: onEnd }
    }
  })()

  const style: CSSProperties = {
    width: 'calc(100% - 32px)',
    height: 72,
    margin: '0 16px',
    borderRadius: 14,
    background: config.color,
    color: '#fff',
    fontSize: 17,
    fontWeight: 600,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    touchAction: 'manipulation',
  }

  return (
    <div style={{ height: 88, display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
      <button
        onClick={config.onClick}
        disabled={loading}
        aria-busy={loading}
        style={style}
      >
        {config.icon}
        {config.label}
      </button>
    </div>
  )
}
