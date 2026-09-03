'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'

export function OfflineBanner() {
  const { pendingCount, isOnline } = useOfflineSync()

  if (isOnline && pendingCount === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: isOnline ? 'var(--vert)' : 'var(--encre-douce)',
      color: '#fff',
      padding: '8px 16px',
      fontSize: 14,
      textAlign: 'center',
    }}>
      {!isOnline
        ? `Hors ligne${pendingCount > 0 ? ` — ${pendingCount} pointage${pendingCount > 1 ? 's' : ''} en attente` : ''}`
        : `Synchronisation en cours — ${pendingCount} pointage${pendingCount > 1 ? 's' : ''}…`}
    </div>
  )
}
