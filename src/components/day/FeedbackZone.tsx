'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'

type Cancellation = {
  message: string
  onCancel: () => void | Promise<void>
}

type Props = {
  error: string | null
  cancellation: Cancellation | null
  onCancellationExpire: () => void
}

export function FeedbackZone({ error, cancellation, onCancellationExpire }: Props) {
  const [progress, setProgress] = useState(100)
  const expireRef = useRef(onCancellationExpire)
  expireRef.current = onCancellationExpire

  useEffect(() => {
    if (!cancellation) {
      setProgress(100)
      return
    }
    setProgress(100)
    const start = Date.now()
    const duration = 60_000
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 1 - elapsed / duration)
      setProgress(remaining * 100)
      if (remaining <= 0) {
        clearInterval(interval)
        expireRef.current()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [cancellation])

  const hasContent = !!(cancellation || error)

  return (
    <div
      role={hasContent ? 'alert' : undefined}
      style={{
        height: 56,
        margin: '8px 16px 0',
        borderRadius: 8,
        overflow: 'hidden',
        visibility: hasContent ? 'visible' : 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {cancellation ? (
        <>
          <div style={{
            height: '100%',
            background: 'var(--encre)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}>
            <span style={{ fontSize: 14, color: '#fff' }}>{cancellation.message}</span>
            <button
              type="button"
              onClick={() => { void cancellation.onCancel() }}
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 8px',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Annuler
            </button>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              background: 'var(--bleu-ciel)',
              width: `${progress}%`,
              transition: 'width 1s linear',
            }}
          />
        </>
      ) : error ? (
        <div style={{
          height: '100%',
          background: 'rgba(220,38,38,0.08)',
          boxShadow: 'inset 0 0 0 1px var(--rouge)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
        }}>
          <AlertCircle size={16} color="var(--rouge)" />
          <span style={{ fontSize: 14, color: 'var(--rouge)' }}>{error}</span>
        </div>
      ) : null}
    </div>
  )
}
