'use client'

import { useState, useCallback } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import Image from 'next/image'
import { Wrench, Coffee, Play, CheckSquare } from 'lucide-react'
import { StatusBanner } from './StatusBanner'
import { DayShiftButton } from './DayShiftButton'
import { useSnackbar } from '@/hooks/useSnackbar'
import { clockIn } from '@/actions/shift/clockIn'
import { startBreak } from '@/actions/shift/startBreak'
import { resumeWork } from '@/actions/shift/resumeWork'
import { endDay } from '@/actions/shift/endDay'
import { resumeDay } from '@/actions/shift/resumeDay'
import { endIntervention } from '@/actions/intervention/endIntervention'
import { enqueueAction } from '@/lib/outbox'
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

type ClientInfo = { id: string; name: string } | null

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

type Props = {
  status: EtatJournee
  shift: ShiftClient | null
  openIntervention: InterventionClient | null
  openBreak: BreakClient | null
  chronoStartAt: number | null
  userName: string
}

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(15)
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

export function DayScreen({ status: initialStatus, shift, openIntervention, openBreak, chronoStartAt, userName }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<EtatJournee>(initialStatus)
  const [loading, setLoading] = useState(false)
  const { showError, snackbarNode } = useSnackbar()

  const refresh = useCallback(() => router.refresh(), [router])

  async function executeWithOutbox<T>(
    idempotencyKey: string,
    type: string,
    payload: Record<string, unknown>,
    onlineAction: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
    optimisticStatus: EtatJournee,
  ) {
    if (loading) return
    vibrate()
    setLoading(true)
    setStatus(optimisticStatus)
    if (!navigator.onLine) {
      await enqueueAction({ id: idempotencyKey, type, payload, createdAt: Date.now() })
      setLoading(false)
      return
    }
    const result = await onlineAction()
    if (!result.ok) {
      showError((result as { ok: false; error: string }).error)
      setStatus(initialStatus)
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
    await executeWithOutbox(key, 'clockIn', { idempotencyKey: key }, () => clockIn(key), 'AU_TRAVAIL')
  }

  const handleLunchBreak = async () => {
    const key = uuidv4()
    await executeWithOutbox(key, 'startBreak', { type: 'LUNCH', idempotencyKey: key }, () => startBreak('LUNCH', key), 'PAUSE_DEJEUNER')
  }

  const handleResumeWork = async () => {
    const key = uuidv4()
    await executeWithOutbox(key, 'resumeWork', { idempotencyKey: key }, () => resumeWork(), 'AU_TRAVAIL')
  }

  const handleEndDay = async () => {
    const key = uuidv4()
    await executeWithOutbox(key, 'endDay', { idempotencyKey: key }, () => endDay(), 'JOURNEE_TERMINEE')
  }

  const handleResumeDay = async () => {
    const key = uuidv4()
    await executeWithOutbox(key, 'resumeDay', {}, () => resumeDay(), 'AU_TRAVAIL')
  }

  const handleEndIntervention = async () => {
    if (!openIntervention) return
    vibrate()
    setLoading(true)
    const result = await endIntervention(openIntervention.id)
    setLoading(false)
    if (result.ok) {
      router.push(`/intervention/${openIntervention.id}/fin`)
    } else {
      showError((result as { ok: false; error: string }).error)
    }
  }

  /* ---- Styles des boutons ---- */

  const primaryStyle = (color: string): CSSProperties => ({
    width: 'calc(100% - 32px)',
    height: 72,
    margin: '0 16px',
    borderRadius: 14,
    background: color,
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
    flexShrink: 0,
  })

  const secondaryStyle = (color: string, visible: boolean): CSSProperties => ({
    flex: 1,
    height: 52,
    borderRadius: 12,
    background: 'transparent',
    color,
    fontSize: 13,
    fontWeight: 600,
    border: `1.5px solid ${color}`,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    touchAction: 'manipulation',
    visibility: visible ? 'visible' : 'hidden',
    pointerEvents: visible ? 'auto' : 'none',
    flexShrink: 0,
  })

  /* ---- Contenu des slots par état ---- */

  const EMPTY_SEC = { label: '', icon: null, color: 'transparent', onClick: () => {}, visible: false }

  type SecSlot = { label: string; icon: ReactNode; color: string; onClick: () => void; visible: boolean }
  type Slots = { primary: { label: string; icon: ReactNode; color: string; onClick: () => void }; sec1: SecSlot; sec2: SecSlot }

  const slots: Slots = (() => {
    switch (status) {
      case 'HORS_POSTE':
      case 'JOURNEE_TERMINEE':
        return {
          primary: { label: '', icon: null, color: 'transparent', onClick: () => {} },
          sec1: EMPTY_SEC,
          sec2: EMPTY_SEC,
        }
      case 'AU_TRAVAIL':
        return {
          primary: { label: 'Démarrer une intervention', icon: <Wrench size={22} />, color: 'var(--violet)', onClick: () => router.push('/intervention/nouvelle') },
          sec1: { label: 'Pause déjeuner',  icon: <Coffee size={18} />, color: 'var(--ambre)', onClick: handleLunchBreak, visible: true },
          sec2: EMPTY_SEC,
        }
      case 'PAUSE_DEJEUNER':
        return {
          primary: { label: 'Reprendre le travail', icon: <Play size={22} />, color: 'var(--vert)', onClick: handleResumeWork },
          sec1: EMPTY_SEC,
          sec2: EMPTY_SEC,
        }
      case 'EN_INTERVENTION':
        return {
          primary: { label: "Terminer l'intervention", icon: <CheckSquare size={22} />, color: 'var(--violet)', onClick: handleEndIntervention },
          sec1: { label: 'Pause déjeuner', icon: <Coffee size={18} />, color: 'var(--ambre)', onClick: handleLunchBreak, visible: true },
          sec2: EMPTY_SEC,
        }
      default: {
        const _: never = status
        return { primary: { label: '', icon: null, color: 'transparent', onClick: () => {} }, sec1: EMPTY_SEC, sec2: EMPTY_SEC }
      }
    }
  })()

  const firstName = userName.split(' ')[0]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--fond)', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER ZONE — 56px fixe */}
      <header style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--trait)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/froid-gerber-flocon.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 13, color: 'var(--encre-douce)', fontWeight: 500 }}>
            {DATE_FMT.format(new Date())}
          </span>
        </div>
        <span style={{ fontSize: 15, color: 'var(--encre)', fontWeight: 500 }}>
          Bonjour, {firstName}
        </span>
      </header>

      {/* STATUS ZONE — 240px fixe */}
      <StatusBanner
        status={status}
        clientName={openIntervention?.client?.name ?? undefined}
        chronoStartAt={chronoStartAt}
        shiftStartAt={shift?.startAt ?? null}
        shiftEndAt={shift?.endAt ?? null}
        breaks={shift?.breaks ?? []}
        arrivalLabel={shift ? arrivalLabel() : undefined}
      />

      {/* ACTION ZONE — visible only when day is in progress
          paddingTop(16) + primary(72) + gap(12) + secRow(52) = 152 */}
      <div style={{
        height: 152,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingTop: 16,
        flexShrink: 0,
        visibility: (status === 'HORS_POSTE' || status === 'JOURNEE_TERMINEE') ? 'hidden' : 'visible',
        pointerEvents: (status === 'HORS_POSTE' || status === 'JOURNEE_TERMINEE') ? 'none' : 'auto',
      }}>
        <button
          onClick={slots.primary.onClick}
          disabled={loading}
          aria-busy={loading}
          style={primaryStyle(slots.primary.color)}
        >
          {slots.primary.icon}
          {slots.primary.label}
        </button>

        <div style={{ display: 'flex', gap: 12, padding: '0 16px', flexShrink: 0 }}>
          <button
            onClick={slots.sec1.onClick}
            disabled={loading || !slots.sec1.visible}
            style={secondaryStyle(slots.sec1.color, slots.sec1.visible)}
          >
            {slots.sec1.icon}
            {slots.sec1.label}
          </button>
          <button
            onClick={slots.sec2.onClick}
            disabled={loading || !slots.sec2.visible}
            style={secondaryStyle(slots.sec2.color, slots.sec2.visible)}
          >
            {slots.sec2.icon}
            {slots.sec2.label}
          </button>
        </div>
      </div>

      {/* SPACER — pousse le bouton Fin de journée vers le bas */}
      <div style={{ flex: 1 }} />

      {/* SHIFT BUTTON — always visible, adapts to state */}
      <DayShiftButton
        status={status}
        loading={loading}
        onStart={handleClockIn}
        onEnd={handleEndDay}
        onResume={handleResumeDay}
      />

      {/* FEEDBACK ZONE — 56px fixe (erreur ou annulation) */}
      {snackbarNode}

    </div>
  )
}
