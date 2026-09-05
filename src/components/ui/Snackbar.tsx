'use client'

import { AlertCircle } from 'lucide-react'

type Props = {
  message: string
  exiting: boolean
  onDismiss: () => void
}

export function Snackbar({ message, exiting, onDismiss }: Props) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: 'calc(64px + env(safe-area-inset-bottom) + 12px)',
        left: 16,
        right: 16,
        zIndex: 50,
        animation: `${exiting ? 'snack-out' : 'snack-in'} 220ms ease forwards`,
        cursor: 'pointer',
      }}
    >
      <div style={{
        background: '#1a1a2e',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        borderLeft: '4px solid var(--rouge)',
      }}>
        <AlertCircle size={18} color="var(--rouge)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 14, color: '#fff', lineHeight: 1.4 }}>{message}</span>
      </div>
    </div>
  )
}
