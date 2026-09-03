'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveWorkReport } from '@/actions/intervention/saveWorkReport'

const CHIPS = [
  'Recharge fluide',
  'Remplacement compresseur',
  "Contrôle d'étanchéité",
  'Dégivrage',
  'Devis à faire',
  'Retour prévu',
  'Maintenance préventive',
  'Dépannage électrique',
]

export function WorkReportForm({
  interventionId,
  workReport,
}: {
  interventionId: string
  workReport: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set())
  const [freeText, setFreeText] = useState('')

  function toggleChip(chip: string) {
    setSelectedChips(prev => {
      const next = new Set(prev)
      if (next.has(chip)) next.delete(chip)
      else next.add(chip)
      return next
    })
  }

  function handleSave() {
    const parts: string[] = []
    if (selectedChips.size > 0) parts.push([...selectedChips].join(', '))
    if (freeText.trim()) parts.push(freeText.trim())
    const report = parts.join(' — ')

    startTransition(async () => {
      await saveWorkReport(interventionId, report)
      if ('vibrate' in navigator) navigator.vibrate(15)
      router.push('/interventions')
      router.refresh()
    })
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 16 }}>
        Qu&apos;est-ce que vous avez fait ?
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => toggleChip(chip)}
            style={{
              padding: '10px 16px',
              borderRadius: 24,
              border: `2px solid ${selectedChips.has(chip) ? 'var(--acier)' : 'var(--trait)'}`,
              background: selectedChips.has(chip) ? 'rgba(11,95,165,0.1)' : 'var(--surface)',
              color: selectedChips.has(chip) ? 'var(--acier)' : 'var(--encre)',
              fontSize: 15,
              fontWeight: selectedChips.has(chip) ? 600 : 400,
              minHeight: 44,
              cursor: 'pointer',
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        value={freeText}
        onChange={e => setFreeText(e.target.value)}
        placeholder="Ajouter un détail… (la dictée vocale du clavier fonctionne ici)"
        rows={3}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid var(--trait)',
          borderRadius: 8,
          fontSize: 18,
          color: 'var(--encre)',
          background: 'var(--surface)',
          resize: 'none',
          marginBottom: 20,
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            height: 96,
            borderRadius: 12,
            background: 'var(--acier)',
            color: '#fff',
            fontSize: 20,
            fontWeight: 600,
            border: 'none',
            width: '100%',
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Enregistrement…' : 'ENREGISTRER'}
        </button>
        <button
          onClick={() => router.push('/interventions')}
          style={{
            height: 64,
            borderRadius: 12,
            background: 'transparent',
            color: 'var(--encre-douce)',
            fontSize: 18,
            border: '2px solid var(--trait)',
            width: '100%',
            cursor: 'pointer',
          }}
        >
          Passer (enregistrer sans compte rendu)
        </button>
      </div>
    </div>
  )
}
