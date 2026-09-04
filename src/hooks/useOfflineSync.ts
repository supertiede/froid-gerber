'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPendingActions, removeAction, incrementRetry, countPending } from '@/lib/outbox'
import { clockIn } from '@/actions/shift/clockIn'
import { startBreak } from '@/actions/shift/startBreak'
import { resumeWork } from '@/actions/shift/resumeWork'
import { endDay } from '@/actions/shift/endDay'
import { resumeDay } from '@/actions/shift/resumeDay'
import { startIntervention } from '@/actions/intervention/startIntervention'
import { endIntervention } from '@/actions/intervention/endIntervention'

type ActionResult = { ok: boolean; error?: string }

async function replayAction(type: string, payload: Record<string, unknown>): Promise<ActionResult> {
  switch (type) {
    case 'clockIn':
      return clockIn(payload.idempotencyKey as string)
    case 'startBreak':
      return startBreak(payload.type as 'LUNCH' | 'SHORT', payload.idempotencyKey as string)
    case 'resumeWork':
      return resumeWork()
    case 'endDay':
      return endDay()
    case 'resumeDay':
      return resumeDay()
    case 'startIntervention':
      return startIntervention(payload as Parameters<typeof startIntervention>[0])
    case 'endIntervention':
      return endIntervention(payload.interventionId as string)
    default:
      return { ok: false, error: `Unknown action type: ${type}` }
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
          await removeAction(action.id)
          console.error('[outbox] Action abandoned after 3 retries:', action)
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

    if (navigator.onLine) replayQueue()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [replayQueue, updateCount])

  return { pendingCount, isOnline, updateCount }
}
