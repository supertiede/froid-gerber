'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { modifierIntervention, supprimerIntervention } from '@/actions/interventions'
import { ChipsCompteRendu } from './ChipsCompteRendu'
import { formatDuree } from '@/lib/temps'
import { tempsInterventionMinutes } from '@/lib/calculs'

type ClientSer = {
  id: string
  nom: string
  nomNormalise: string
  actif: boolean
  createdAt: string
  creeParId: string | null
}

type InterventionSer = {
  id: string
  type: 'CLIENT' | 'ATELIER'
  client: ClientSer | null
  debutAt: string
  finAt: string | null
  trajetMinutes: number
  compteRendu: string | null
  origine: string
  createdAt: string
  updatedAt: string
}

type ModifSer = {
  id: string
  champ: string
  ancienne: string | null
  nouvelle: string | null
  at: string
}

function formatHM(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris',
  })
}

export function InterventionDetail({
  intervention,
  modifications,
}: {
  intervention: InterventionSer
  modifications: ModifSer[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheet, setSheet] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const nomClient =
    intervention.type === 'ATELIER' ? 'Atelier' : intervention.client?.nom ?? '—'

  const dureeMinutes = intervention.finAt
    ? Math.floor(
        (new Date(intervention.finAt).getTime() - new Date(intervention.debutAt).getTime()) /
          60000,
      )
    : null

  const total = intervention.finAt
    ? tempsInterventionMinutes({
        debutAt: new Date(intervention.debutAt),
        finAt: new Date(intervention.finAt),
        trajetMinutes: intervention.trajetMinutes,
      })
    : null

  function save(champ: string, valeur: string) {
    setError('')
    startTransition(async () => {
      const result = await modifierIntervention(
        intervention.id,
        champ as Parameters<typeof modifierIntervention>[1],
        valeur,
      )
      if (result.ok) {
        setSheet(null)
        router.refresh()
      } else {
        setError(result.error ?? 'Erreur')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await supprimerIntervention(intervention.id)
      if (result.ok) router.push('/interventions')
      else setError(result.error ?? 'Erreur')
    })
  }

  const rows: { champ: string; label: string; valeur: string }[] = [
    { champ: 'debutAt', label: 'Début', valeur: formatHM(intervention.debutAt) },
    {
      champ: 'finAt',
      label: 'Fin',
      valeur: intervention.finAt ? formatHM(intervention.finAt) : '—',
    },
    { champ: 'trajetMinutes', label: 'Trajet aller', valeur: `${intervention.trajetMinutes} min` },
    { champ: 'compteRendu', label: 'Compte rendu', valeur: intervention.compteRendu ?? '—' },
  ]

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--trait)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            fontSize: 24,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            minHeight: 'auto',
            padding: 4,
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>{nomClient}</h1>
          {modifications.length > 0 && (
            <p style={{ fontSize: 13, color: 'var(--encre-douce)' }}>
              Modifié {new Date(modifications[0].at).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </div>

      {/* Summary line */}
      {total !== null && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--trait)',
            fontSize: 15,
            color: 'var(--encre-douce)',
          }}
        >
          {formatHM(intervention.debutAt)} →{' '}
          {intervention.finAt ? formatHM(intervention.finAt) : '…'} ·{' '}
          {dureeMinutes !== null ? formatDuree(dureeMinutes) : ''} +{' '}
          {formatDuree(intervention.trajetMinutes * 2)} trajet ={' '}
          <strong>{formatDuree(total)}</strong>
        </div>
      )}

      {/* Editable rows */}
      {rows.map(row => (
        <button
          key={row.champ}
          onClick={() => setSheet(row.champ)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 16px',
            minHeight: 56,
            borderBottom: '1px solid var(--trait)',
            background: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 15, color: 'var(--encre-douce)' }}>{row.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 18,
                color: 'var(--encre)',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.champ === 'compteRendu' && row.valeur.length > 30
                ? row.valeur.slice(0, 30) + '…'
                : row.valeur}
            </span>
            <span style={{ color: 'var(--encre-douce)' }}>›</span>
          </div>
        </button>
      ))}

      {error && (
        <p style={{ padding: '8px 16px', color: 'var(--rouge)', fontSize: 15 }}>{error}</p>
      )}

      {/* Delete */}
      <div style={{ padding: '32px 16px 0' }}>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%',
              height: 56,
              borderRadius: 8,
              border: '1px solid var(--rouge)',
              background: 'transparent',
              color: 'var(--rouge)',
              fontSize: 18,
            }}
          >
            Supprimer cette intervention
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 8,
                background: 'var(--rouge)',
                color: '#fff',
                fontSize: 18,
                border: 'none',
              }}
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 8,
                border: '1px solid var(--trait)',
                background: 'transparent',
                color: 'var(--encre)',
                fontSize: 18,
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Modifications history */}
      {modifications.length > 0 && (
        <div style={{ padding: '24px 16px 0' }}>
          <h3
            style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre-douce)', marginBottom: 8 }}
          >
            Historique
          </h3>
          {modifications.map(m => (
            <div
              key={m.id}
              style={{
                fontSize: 13,
                color: 'var(--encre-douce)',
                padding: '6px 0',
                borderBottom: '1px solid var(--trait)',
              }}
            >
              {m.champ} : {m.ancienne ?? '—'} → {m.nouvelle ?? '—'} ·{' '}
              {new Date(m.at).toLocaleString('fr-FR')}
            </div>
          ))}
        </div>
      )}

      {/* --- Sheets --- */}

      {/* debutAt */}
      <Sheet open={sheet === 'debutAt'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent side="bottom" style={{ padding: 24 }}>
          <SheetHeader>
            <SheetTitle>Heure de début</SheetTitle>
          </SheetHeader>
          <EditTimeSheet
            defaultTime={intervention.debutAt.slice(11, 16)}
            dateRef={intervention.debutAt.slice(0, 10)}
            onSave={val => save('debutAt', val)}
            isPending={isPending}
          />
        </SheetContent>
      </Sheet>

      {/* finAt */}
      <Sheet open={sheet === 'finAt'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent side="bottom" style={{ padding: 24 }}>
          <SheetHeader>
            <SheetTitle>Heure de fin</SheetTitle>
          </SheetHeader>
          <EditTimeSheet
            defaultTime={intervention.finAt?.slice(11, 16) ?? ''}
            dateRef={intervention.debutAt.slice(0, 10)}
            onSave={val => save('finAt', val)}
            isPending={isPending}
          />
        </SheetContent>
      </Sheet>

      {/* trajetMinutes */}
      <Sheet open={sheet === 'trajetMinutes'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent side="bottom" style={{ padding: 24 }}>
          <SheetHeader>
            <SheetTitle>Trajet aller (min)</SheetTitle>
          </SheetHeader>
          <EditTrajetSheet onSave={val => save('trajetMinutes', val)} isPending={isPending} />
        </SheetContent>
      </Sheet>

      {/* compteRendu */}
      <Sheet open={sheet === 'compteRendu'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent
          side="bottom"
          style={{ padding: 24, maxHeight: '85vh', overflowY: 'auto' }}
        >
          <SheetHeader>
            <SheetTitle>Compte rendu</SheetTitle>
          </SheetHeader>
          <ChipsCompteRendu
            valeurInitiale={intervention.compteRendu ?? ''}
            onSauvegarder={val => save('compteRendu', val)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function EditTimeSheet({
  defaultTime,
  dateRef,
  onSave,
  isPending,
}: {
  defaultTime: string
  dateRef: string
  onSave: (iso: string) => void
  isPending: boolean
}) {
  const [time, setTime] = useState(defaultTime)
  return (
    <div style={{ marginTop: 16 }}>
      <input
        type="time"
        value={time}
        onChange={e => setTime(e.target.value)}
        style={{
          width: '100%',
          height: 64,
          fontSize: 24,
          border: '1px solid var(--trait)',
          borderRadius: 8,
          padding: '0 16px',
        }}
      />
      <button
        onClick={() => {
          const iso = `${dateRef}T${time}:00.000Z`
          onSave(iso)
        }}
        disabled={isPending || !time}
        style={{
          width: '100%',
          height: 64,
          marginTop: 16,
          background: 'var(--acier)',
          color: '#fff',
          borderRadius: 12,
          fontSize: 18,
          fontWeight: 600,
          border: 'none',
        }}
      >
        Enregistrer
      </button>
    </div>
  )
}

function EditTrajetSheet({
  onSave,
  isPending,
}: {
  onSave: (val: string) => void
  isPending: boolean
}) {
  const [custom, setCustom] = useState('')
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {[0, 5, 10, 15, 20, 30].map(p => (
          <button
            key={p}
            onClick={() => onSave(String(p))}
            disabled={isPending}
            style={{
              flex: '1 1 calc(33% - 8px)',
              height: 64,
              border: '2px solid var(--trait)',
              borderRadius: 8,
              background: 'var(--surface)',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--encre)',
            }}
          >
            {p} min
          </button>
        ))}
      </div>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Autre…"
        value={custom}
        onChange={e => setCustom(e.target.value)}
        style={{
          width: '100%',
          height: 56,
          border: '1px solid var(--trait)',
          borderRadius: 8,
          padding: '0 16px',
          fontSize: 18,
          marginBottom: 12,
        }}
      />
      {custom && (
        <button
          onClick={() => onSave(custom)}
          disabled={isPending}
          style={{
            width: '100%',
            height: 64,
            background: 'var(--acier)',
            color: '#fff',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 600,
            border: 'none',
          }}
        >
          Enregistrer {custom} min
        </button>
      )}
    </div>
  )
}
