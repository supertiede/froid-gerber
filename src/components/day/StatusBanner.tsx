'use client'

import { Timer } from './Timer'
import type { EtatJournee } from '@/lib/etat-journee'

const CONFIG: Record<EtatJournee, { bg: string; label: string }> = {
  HORS_POSTE:       { bg: 'var(--gris-etat)',  label: 'Pas encore arrivé' },
  AU_TRAVAIL:       { bg: 'var(--vert)',        label: 'Au travail' },
  PAUSE_DEJEUNER:   { bg: 'var(--ambre)',       label: 'Pause déjeuner' },
  EN_PAUSE:         { bg: 'var(--ambre)',       label: 'En pause' },
  EN_INTERVENTION:  { bg: 'var(--cuivre)',      label: 'En intervention' },
  JOURNEE_TERMINEE: { bg: 'var(--acier)',       label: 'Journée terminée' },
}

type Props = {
  status: EtatJournee
  clientName?: string
  chronoStartAt: number | null
  arrivalLabel?: string
}

export function StatusBanner({ status, clientName, chronoStartAt, arrivalLabel }: Props) {
  const { bg, label } = CONFIG[status]
  const displayLabel = status === 'EN_INTERVENTION' && clientName ? clientName : label

  return (
    <div
      role="status"
      aria-label={`Statut : ${displayLabel}`}
      style={{
        background: bg,
        padding: '24px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        minHeight: 180,
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 600, color: '#fff', textAlign: 'center' }}>
        {displayLabel}
      </span>
      {chronoStartAt && (
        <Timer startAt={chronoStartAt} />
      )}
      {arrivalLabel && (
        <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          {arrivalLabel}
        </span>
      )}
    </div>
  )
}
