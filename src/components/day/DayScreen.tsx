'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { StatusBanner } from './StatusBanner'
import { CancellationBanner } from './CancellationBanner'
import { clockIn } from '@/actions/shift/clockIn'
import { cancelClockIn } from '@/actions/shift/cancelClockIn'
import { startBreak } from '@/actions/shift/startBreak'
import { cancelBreak } from '@/actions/shift/cancelBreak'
import { resumeWork } from '@/actions/shift/resumeWork'
import { endDay } from '@/actions/shift/endDay'
import { cancelEndDay } from '@/actions/shift/cancelEndDay'
import { resumeDay } from '@/actions/shift/resumeDay'
import { endIntervention } from '@/actions/intervention/endIntervention'
import { enqueueAction, removeAction } from '@/lib/outbox'
import type { EtatJournee } from '@/lib/etat-journee'
import { formatTime } from '@/lib/time/formatTime'
import { formatDuration } from '@/lib/time/formatDuration'
import { breaksDuration } from '@/lib/calculations/breaksDuration'

type BreakClient = {
  id: string
  shiftId: string
  type: string
  startAt: string
  endAt: string | null
  startOrigin: string
  endOrigin: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
}

type ShiftClient = {
  id: string
  userId: string
  startAt: string
  endAt: string | null
  startOrigin: string
  endOrigin: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
  breaks: BreakClient[]
}

type ClientInfo = {
  id: string
  name: string
} | null

type InterventionClient = {
  id: string
  userId: string
  type: string
  clientId: string | null
  startAt: string
  endAt: string | null
  travelMinutes: number
  workReport: string | null
  origin: string
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
  client: ClientInfo
}

type Cancellation = {
  message: string
  onCancel: () => Promise<void>
}

type Props = {
  status: EtatJournee
  shift: ShiftClient | null
  openIntervention: InterventionClient | null
  openBreak: BreakClient | null
  chronoStartAt: number | null
  userName: string
}

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(15)
  }
}

export function DayScreen({ status: initialStatus, shift, openIntervention, openBreak, chronoStartAt, userName }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<EtatJournee>(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellation, setCancellation] = useState<Cancellation | null>(null)

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  async function execute<T>(
    action: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
    optimisticStatus: EtatJournee,
    cancellationMessage: string,
    undoAction: () => Promise<void>,
  ) {
    if (loading) return
    vibrate()
    setLoading(true)
    setError(null)
    setStatus(optimisticStatus)

    const result = await action()

    if (!result.ok) {
      setError((result as { ok: false; error: string }).error)
      setStatus(initialStatus)
    } else {
      setCancellation({
        message: cancellationMessage,
        onCancel: async () => {
          setCancellation(null)
          await undoAction()
          refresh()
        },
      })
    }

    setLoading(false)
    refresh()
  }

  async function executeWithOutbox<T>(
    idempotencyKey: string,
    type: string,
    payload: Record<string, unknown>,
    onlineAction: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
    optimisticStatus: EtatJournee,
    cancellationMessage: string,
    undoAction: () => Promise<void>,
  ) {
    if (loading) return
    vibrate()
    setLoading(true)
    setError(null)
    setStatus(optimisticStatus)

    if (!navigator.onLine) {
      await enqueueAction({ id: idempotencyKey, type, payload, createdAt: Date.now() })
      setCancellation({
        message: `${cancellationMessage} (hors ligne)`,
        onCancel: async () => {
          setCancellation(null)
          await removeAction(idempotencyKey)
          setStatus(initialStatus)
        },
      })
      setLoading(false)
      return
    }

    const result = await onlineAction()

    if (!result.ok) {
      setError((result as { ok: false; error: string }).error)
      setStatus(initialStatus)
    } else {
      setCancellation({
        message: cancellationMessage,
        onCancel: async () => {
          setCancellation(null)
          await undoAction()
          refresh()
        },
      })
    }

    setLoading(false)
    refresh()
  }

  function arrivalLabel(): string {
    if (!shift) return ''
    const parts = [`Arrivé ${formatTime(new Date(shift.startAt))}`]
    const closedBreaks = shift.breaks.filter(b => b.endAt)
    if (closedBreaks.length > 0) {
      const minutes = breaksDuration(
        closedBreaks.map(b => ({ startAt: new Date(b.startAt), endAt: b.endAt ? new Date(b.endAt) : null }))
      )
      if (minutes > 0) parts.push(`Pause ${formatDuration(minutes)}`)
    }
    return parts.join(' · ')
  }

  const handleClockIn = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key,
      'clockIn',
      { idempotencyKey: key },
      () => clockIn(key),
      'AU_TRAVAIL',
      `Arrivée enregistrée à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      async () => {
        if (shift?.id) await cancelClockIn(shift.id)
      },
    )
  }

  const handleLunchBreak = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key,
      'startBreak',
      { type: 'LUNCH', idempotencyKey: key },
      () => startBreak('LUNCH', key),
      'PAUSE_DEJEUNER',
      'Pause déjeuner démarrée',
      async () => {
        if (openBreakRef.current?.id) await cancelBreak(openBreakRef.current.id)
      },
    )
  }

  const handleShortBreak = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key,
      'startBreak',
      { type: 'SHORT', idempotencyKey: key },
      () => startBreak('SHORT', key),
      'EN_PAUSE',
      'Pause démarrée',
      async () => {
        if (openBreakRef.current?.id) await cancelBreak(openBreakRef.current.id)
      },
    )
  }

  const handleResumeWork = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key,
      'resumeWork',
      { idempotencyKey: key },
      () => resumeWork(),
      'AU_TRAVAIL',
      'Reprise du travail enregistrée',
      async () => { refresh() },
    )
  }

  const handleEndDay = async () => {
    const key = uuidv4()
    const shiftId = shift?.id
    await executeWithOutbox(
      key,
      'endDay',
      { idempotencyKey: key },
      () => endDay(),
      'JOURNEE_TERMINEE',
      `Journée terminée à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      async () => {
        if (shiftId) await cancelEndDay(shiftId)
      },
    )
  }

  const handleResumeDay = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key,
      'resumeDay',
      { idempotencyKey: key },
      () => resumeDay(key),
      'AU_TRAVAIL',
      'Journée reprise',
      async () => { refresh() },
    )
  }

  const openBreakRef = { current: openBreak }

  const primaryButton = (label: string, onClick: () => void | Promise<void>, color?: string) => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: 'calc(100% - 32px)',
        height: 96,
        margin: '0 16px',
        borderRadius: 12,
        background: color ?? 'var(--acier)',
        color: '#fff',
        fontSize: 20,
        fontWeight: 600,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </button>
  )

  const secondaryButton = (label: string, onClick: () => void | Promise<void>, color?: string) => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1,
        height: 64,
        borderRadius: 12,
        background: 'transparent',
        color: color ?? 'var(--acier)',
        fontSize: 15,
        fontWeight: 600,
        border: `2px solid ${color ?? 'var(--acier)'}`,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  )

  const clientName = openIntervention?.client?.name

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fond)' }}>
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, color: 'var(--encre-douce)', fontWeight: 500 }}>
          Bonjour, {userName}
        </span>
      </div>

      <StatusBanner
        status={status}
        clientName={clientName}
        chronoStartAt={chronoStartAt}
        arrivalLabel={shift ? arrivalLabel() : undefined}
      />

      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{
            margin: '0 16px',
            padding: '12px 16px',
            background: 'rgba(163,43,36,0.1)',
            border: '1px solid var(--rouge)',
            borderRadius: 8,
            color: 'var(--rouge)',
            fontSize: 15,
          }}>
            {error}
          </div>
        )}

        {status === 'HORS_POSTE' && (
          <>
            {primaryButton('JE SUIS ARRIVÉ', handleClockIn, 'var(--vert)')}
            <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
              {secondaryButton("Démarrer une intervention", () => router.push('/intervention/nouvelle'), 'var(--cuivre)')}
              {secondaryButton("J'ai oublié de pointer", () => router.push('/oubli'))}
            </div>
          </>
        )}

        {status === 'AU_TRAVAIL' && (
          <>
            {primaryButton("DÉMARRER UNE INTERVENTION", () => router.push('/intervention/nouvelle'), 'var(--cuivre)')}
            <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
              {secondaryButton('Pause déjeuner', handleLunchBreak, 'var(--ambre)')}
              {secondaryButton('Faire une pause', handleShortBreak, 'var(--ambre)')}
            </div>
            <div style={{ padding: '0 16px' }}>
              {secondaryButton('Fin de journée', handleEndDay, 'var(--gris-etat)')}
            </div>
          </>
        )}

        {(status === 'PAUSE_DEJEUNER' || status === 'EN_PAUSE') && (
          <>
            {primaryButton('REPRENDRE LE TRAVAIL', handleResumeWork, 'var(--vert)')}
          </>
        )}

        {status === 'EN_INTERVENTION' && (
          <>
            {primaryButton("TERMINER L'INTERVENTION", async () => {
              if (!openIntervention) return
              vibrate()
              setLoading(true)
              const result = await endIntervention(openIntervention.id)
              setLoading(false)
              if (result.ok) {
                router.push(`/intervention/${openIntervention.id}/fin`)
              } else {
                setError((result as { ok: false; error: string }).error)
              }
            }, 'var(--cuivre)')}
            <div style={{ padding: '0 16px' }}>
              {secondaryButton('Faire une pause', handleShortBreak, 'var(--ambre)')}
            </div>
          </>
        )}

        {status === 'JOURNEE_TERMINEE' && (
          <>
            {primaryButton('REPRENDRE LE TRAVAIL', handleResumeDay, 'var(--vert)')}
            <div style={{ padding: '0 16px' }}>
              {secondaryButton('Voir ma journée', () => router.push('/semaine'))}
            </div>
          </>
        )}
      </div>

      {cancellation && (
        <CancellationBanner
          message={cancellation.message}
          onCancel={cancellation.onCancel}
          onExpire={() => setCancellation(null)}
        />
      )}
    </div>
  )
}
