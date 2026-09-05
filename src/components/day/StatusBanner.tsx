'use client'

import { MapPin, Briefcase, Coffee, Wrench, CheckCircle, LogIn, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Timer } from './Timer'
import { WorkTimer } from './WorkTimer'
import { formatTime } from '@/lib/time/formatTime'
import { formatDuration } from '@/lib/time/formatDuration'
import type { EtatJournee } from '@/lib/etat-journee'

type Break = {
  startAt: string
  endAt: string | null
}

type StateConfig = {
  bg: string
  label: string
  Icon: LucideIcon
}

const CONFIG: Record<EtatJournee, StateConfig> = {
  HORS_POSTE:       { bg: 'var(--gris-etat)', label: 'Pas encore arrivé', Icon: MapPin },
  AU_TRAVAIL:       { bg: 'var(--vert)',       label: 'Au travail',        Icon: Briefcase },
  PAUSE_DEJEUNER:   { bg: 'var(--ambre)',      label: 'Pause déjeuner',    Icon: Coffee },
  EN_INTERVENTION:  { bg: 'var(--violet)',     label: 'En intervention',   Icon: Wrench },
  JOURNEE_TERMINEE: { bg: 'var(--gris-etat)', label: 'Journée terminée',  Icon: CheckCircle },
}

type Props = {
  status: EtatJournee
  clientName?: string
  chronoStartAt: number | null
  shiftStartAt: string | null
  shiftEndAt: string | null
  breaks: Break[]
  arrivalLabel?: string
}

export function StatusBanner({ status, clientName, chronoStartAt, shiftStartAt, shiftEndAt, breaks, arrivalLabel }: Props) {
  const { bg, label, Icon } = CONFIG[status]
  const displayLabel = status === 'EN_INTERVENTION' && clientName ? clientName : label

  const pauseMinutes = breaks
    .filter(b => b.endAt)
    .reduce((acc, b) => acc + Math.floor((new Date(b.endAt!).getTime() - new Date(b.startAt).getTime()) / 60000), 0)

  const showDayDetail = status === 'JOURNEE_TERMINEE' && !!shiftStartAt && !!shiftEndAt

  return (
    <div
      role="status"
      aria-label={`Statut : ${displayLabel}`}
      style={{
        background: bg,
        height: 240,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={28} color="#fff" />
        <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{displayLabel}</span>
      </div>

      {chronoStartAt ? (
        <Timer startAt={chronoStartAt} />
      ) : (
        <span style={{
          fontSize: 56,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          – h ––
        </span>
      )}

      <WorkTimer shiftStartAt={shiftStartAt} breaks={breaks} />

      {showDayDetail ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
            <LogIn size={13} />
            {formatTime(new Date(shiftStartAt!))}
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>→</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
            <LogOut size={13} />
            {formatTime(new Date(shiftEndAt!))}
          </span>
          {pauseMinutes > 0 && (
            <>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                <Coffee size={13} />
                {formatDuration(pauseMinutes)}
              </span>
            </>
          )}
        </div>
      ) : (
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', minHeight: 18 }}>
          {arrivalLabel ?? ' '}
        </span>
      )}
    </div>
  )
}
