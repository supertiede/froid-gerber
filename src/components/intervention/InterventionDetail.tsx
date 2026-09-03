'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { updateIntervention } from '@/actions/intervention/updateIntervention'
import { deleteIntervention } from '@/actions/intervention/deleteIntervention'
import { WorkReportChips } from './WorkReportChips'
import { formatDuration } from '@/lib/time/formatDuration'
import { interventionMinutes } from '@/lib/calculations/interventionMinutes'
import { EditTimeSheet } from './EditTimeSheet'
import { EditTrajetSheet } from './EditTrajetSheet'

type ClientSer = {
  id: string
  name: string
  normalizedName: string
  active: boolean
  createdAt: string
  createdById: string | null
}

type InterventionSer = {
  id: string
  type: 'CLIENT' | 'WORKSHOP'
  client: ClientSer | null
  startAt: string
  endAt: string | null
  travelMinutes: number
  workReport: string | null
  origin: string
  createdAt: string
  updatedAt: string
}

type AuditLogSer = {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
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
  auditLogs,
}: {
  intervention: InterventionSer
  auditLogs: AuditLogSer[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sheet, setSheet] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const clientName =
    intervention.type === 'WORKSHOP' ? 'Atelier' : intervention.client?.name ?? '—'

  const dureeMinutes = intervention.endAt
    ? Math.floor(
        (new Date(intervention.endAt).getTime() - new Date(intervention.startAt).getTime()) /
          60000,
      )
    : null

  const total = intervention.endAt
    ? interventionMinutes({
        startAt: new Date(intervention.startAt),
        endAt: new Date(intervention.endAt),
        travelMinutes: intervention.travelMinutes,
      })
    : null

  function save(field: string, value: string) {
    setError('')
    startTransition(async () => {
      const result = await updateIntervention(
        intervention.id,
        field as Parameters<typeof updateIntervention>[1],
        value,
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
      const result = await deleteIntervention(intervention.id)
      if (result.ok) router.push('/interventions')
      else setError(result.error ?? 'Erreur')
    })
  }

  const rows: { field: string; label: string; value: string }[] = [
    { field: 'startAt', label: 'Début', value: formatHM(intervention.startAt) },
    {
      field: 'endAt',
      label: 'Fin',
      value: intervention.endAt ? formatHM(intervention.endAt) : '—',
    },
    { field: 'travelMinutes', label: 'Trajet aller', value: `${intervention.travelMinutes} min` },
    { field: 'workReport', label: 'Compte rendu', value: intervention.workReport ?? '—' },
  ]

  return (
    <div style={{ paddingBottom: 24 }}>
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
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>{clientName}</h1>
          {auditLogs.length > 0 && (
            <p style={{ fontSize: 13, color: 'var(--encre-douce)' }}>
              Modifié {new Date(auditLogs[0].at).toLocaleDateString('fr-FR')}
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
          {formatHM(intervention.startAt)} →{' '}
          {intervention.endAt ? formatHM(intervention.endAt) : '…'} ·{' '}
          {dureeMinutes !== null ? formatDuration(dureeMinutes) : ''} +{' '}
          {formatDuration(intervention.travelMinutes * 2)} trajet ={' '}
          <strong>{formatDuration(total)}</strong>
        </div>
      )}

      {/* Editable rows */}
      {rows.map(row => (
        <button
          key={row.field}
          onClick={() => setSheet(row.field)}
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
              {row.field === 'workReport' && row.value.length > 30
                ? row.value.slice(0, 30) + '…'
                : row.value}
            </span>
            <span style={{ color: 'var(--encre-douce)' }}>›</span>
          </div>
        </button>
      ))}

      {error && (
        <p role="alert" style={{ padding: '8px 16px', color: 'var(--rouge)', fontSize: 15 }}>{error}</p>
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

      {/* Audit log history */}
      {auditLogs.length > 0 && (
        <div style={{ padding: '24px 16px 0' }}>
          <h3
            style={{ fontSize: 15, fontWeight: 600, color: 'var(--encre-douce)', marginBottom: 8 }}
          >
            Historique
          </h3>
          {auditLogs.map(m => (
            <div
              key={m.id}
              style={{
                fontSize: 13,
                color: 'var(--encre-douce)',
                padding: '6px 0',
                borderBottom: '1px solid var(--trait)',
              }}
            >
              {m.field} : {m.oldValue ?? '—'} → {m.newValue ?? '—'} ·{' '}
              {new Date(m.at).toLocaleString('fr-FR')}
            </div>
          ))}
        </div>
      )}

      {/* --- Sheets --- */}

      {/* startAt */}
      <Sheet open={sheet === 'startAt'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent side="bottom" style={{ padding: 24 }}>
          <SheetHeader>
            <SheetTitle>Heure de début</SheetTitle>
          </SheetHeader>
          <EditTimeSheet
            defaultTime={intervention.startAt.slice(11, 16)}
            dateRef={intervention.startAt.slice(0, 10)}
            onSave={val => save('startAt', val)}
            isPending={isPending}
          />
        </SheetContent>
      </Sheet>

      {/* endAt */}
      <Sheet open={sheet === 'endAt'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent side="bottom" style={{ padding: 24 }}>
          <SheetHeader>
            <SheetTitle>Heure de fin</SheetTitle>
          </SheetHeader>
          <EditTimeSheet
            defaultTime={intervention.endAt?.slice(11, 16) ?? ''}
            dateRef={intervention.startAt.slice(0, 10)}
            onSave={val => save('endAt', val)}
            isPending={isPending}
          />
        </SheetContent>
      </Sheet>

      {/* travelMinutes */}
      <Sheet open={sheet === 'travelMinutes'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent side="bottom" style={{ padding: 24 }}>
          <SheetHeader>
            <SheetTitle>Trajet aller (min)</SheetTitle>
          </SheetHeader>
          <EditTrajetSheet onSave={val => save('travelMinutes', val)} isPending={isPending} />
        </SheetContent>
      </Sheet>

      {/* workReport */}
      <Sheet open={sheet === 'workReport'} onOpenChange={o => !o && setSheet(null)}>
        <SheetContent
          side="bottom"
          style={{ padding: 24, maxHeight: '85vh', overflowY: 'auto' }}
        >
          <SheetHeader>
            <SheetTitle>Compte rendu</SheetTitle>
          </SheetHeader>
          <WorkReportChips
            initialValue={intervention.workReport ?? ''}
            onSave={val => save('workReport', val)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
