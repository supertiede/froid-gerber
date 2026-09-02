'use client'

import { Chrono } from './Chrono'
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
  etat: EtatJournee
  clientNom?: string
  debutChronoAt: number | null
  arriveeLabel?: string
}

export function BandeauEtat({ etat, clientNom, debutChronoAt, arriveeLabel }: Props) {
  const { bg, label } = CONFIG[etat]
  const displayLabel = etat === 'EN_INTERVENTION' && clientNom ? clientNom : label

  return (
    <div style={{
      background: bg,
      padding: '32px 16px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      minHeight: 180,
    }}>
      <span style={{ fontSize: 28, fontWeight: 600, color: '#fff', textAlign: 'center' }}>
        {displayLabel}
      </span>
      {debutChronoAt && (
        <Chrono startAt={debutChronoAt} />
      )}
      {arriveeLabel && (
        <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          {arriveeLabel}
        </span>
      )}
    </div>
  )
}
