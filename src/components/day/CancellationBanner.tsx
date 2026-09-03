'use client'

import { useEffect, useState } from 'react'

type Props = {
  message: string
  onCancel: () => void
  onExpire: () => void
}

export function CancellationBanner({ message, onCancel, onExpire }: Props) {
  const [remaining, setRemaining] = useState(60)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
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
      <span style={{ fontSize: 15 }}>{message} ({remaining}s)</span>
      <button
        onClick={onCancel}
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
