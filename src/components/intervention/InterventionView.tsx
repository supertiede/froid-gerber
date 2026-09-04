'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { deleteIntervention } from '@/actions/intervention/deleteIntervention'
import { WorkReportForm } from './WorkReportForm'
import { InterventionTimesEditor } from './InterventionTimesEditor'

type Props = {
  interventionId: string
  title: string
  startAt: string
  endAt: string | null
  workReport: string
}

export function InterventionView({ interventionId, title, startAt, endAt, workReport }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteIntervention(interventionId)
      if (result.ok) router.push('/interventions')
      else setError(result.error ?? 'Erreur')
    })
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--fond)', display: 'flex', flexDirection: 'column' }}>

      <header style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--trait)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 8,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            cursor: 'pointer',
            touchAction: 'manipulation',
            flexShrink: 0,
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h1>
      </header>

      <div style={{ padding: '16px 16px 0', flex: 1 }}>
        {endAt && (
          <InterventionTimesEditor
            interventionId={interventionId}
            startAt={startAt}
            endAt={endAt}
          />
        )}
        <WorkReportForm interventionId={interventionId} workReport={workReport} />
      </div>

      {error && (
        <p role="alert" style={{ padding: '8px 16px 0', color: 'var(--rouge)', fontSize: 15 }}>{error}</p>
      )}

      <div style={{ padding: '16px 16px 24px', flexShrink: 0 }}>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%',
              height: 72,
              borderRadius: 14,
              background: 'transparent',
              color: 'var(--rouge)',
              fontSize: 17,
              fontWeight: 600,
              border: '1.5px solid var(--rouge)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              touchAction: 'manipulation',
            }}
          >
            <Trash2 size={20} />
            Supprimer l&apos;intervention
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{
                flex: 1,
                height: 72,
                borderRadius: 14,
                background: 'var(--rouge)',
                color: '#fff',
                fontSize: 17,
                fontWeight: 600,
                border: 'none',
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.7 : 1,
                touchAction: 'manipulation',
              }}
            >
              {isPending ? 'Suppression…' : 'Confirmer'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                flex: 1,
                height: 72,
                borderRadius: 14,
                border: '1.5px solid var(--trait)',
                background: 'transparent',
                color: 'var(--encre)',
                fontSize: 17,
                fontWeight: 600,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
