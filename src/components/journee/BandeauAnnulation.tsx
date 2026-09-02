'use client'

import { useEffect, useState } from 'react'

type Props = {
  message: string
  onAnnuler: () => void
  onExpire: () => void
}

export function BandeauAnnulation({ message, onAnnuler, onExpire }: Props) {
  const [restant, setRestant] = useState(60)

  useEffect(() => {
    const interval = setInterval(() => {
      setRestant(r => {
        if (r <= 1) { onExpire(); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onExpire])

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 16,
      right: 16,
      background: 'var(--encre)',
      color: '#fff',
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 50,
    }}>
      <span style={{ fontSize: 15 }}>{message} ({restant}s)</span>
      <button
        onClick={onAnnuler}
        style={{
          color: '#fff',
          fontWeight: 600,
          fontSize: 15,
          background: 'none',
          border: 'none',
          minHeight: 'auto',
          padding: '4px 8px',
          cursor: 'pointer',
        }}
      >
        Annuler
      </button>
    </div>
  )
}
