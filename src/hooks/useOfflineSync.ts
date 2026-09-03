'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPendingActions, removeAction, incrementRetry, countPending } from '@/lib/outbox'
import { arriver, demarrerPause, reprendreTravail, terminerJournee } from '@/actions/pointage'
import { demarrerIntervention, terminerIntervention } from '@/actions/interventions'

type ActionResult = { ok: boolean; error?: string }

async function replayAction(type: string, payload: Record<string, unknown>): Promise<ActionResult> {
  switch (type) {
    case 'arriver':
      return arriver(payload.cleClient as string)
    case 'demarrerPause':
      return demarrerPause(payload.type as 'DEJEUNER' | 'COURTE', payload.cleClient as string)
    case 'reprendreTravail':
      return reprendreTravail(payload.cleClient as string)
    case 'terminerJournee':
      return terminerJournee(payload.cleClient as string)
    case 'demarrerIntervention':
      return demarrerIntervention(payload as Parameters<typeof demarrerIntervention>[0])
    case 'terminerIntervention':
      return terminerIntervention(payload.interventionId as string)
    default:
      return { ok: false, error: `Type inconnu: ${type}` }
  }
}

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  const updateCount = useCallback(async () => {
    const count = await countPending()
    setPendingCount(count)
  }, [])

  const replayQueue = useCallback(async () => {
    if (!navigator.onLine) return
    const actions = await getPendingActions()
    for (const action of actions) {
      try {
        const result = await replayAction(action.type, action.payload)
        if (result.ok) {
          await removeAction(action.id)
        } else if (action.retries >= 3) {
          // Give up after 3 retries
          await removeAction(action.id)
          console.error('[outbox] Action abandonnée après 3 tentatives:', action)
        } else {
          await incrementRetry(action.id)
        }
      } catch {
        await incrementRetry(action.id)
      }
    }
    await updateCount()
  }, [updateCount])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    updateCount()

    const handleOnline = () => {
      setIsOnline(true)
      replayQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Also replay on mount if online
    if (navigator.onLine) replayQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [replayQueue, updateCount])

  return { pendingCount, isOnline, updateCount }
}
