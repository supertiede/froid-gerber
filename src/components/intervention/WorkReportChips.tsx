'use client'

import { useState } from 'react'

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

export function WorkReportChips({
  initialValue,
  onSave,
}: {
  initialValue: string
  onSave: (val: string) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [text, setText] = useState(initialValue)

  function toggle(chip: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(chip) ? next.delete(chip) : next.add(chip)
      return next
    })
  }

  function handleSave() {
    const parts: string[] = []
    if (selected.size > 0) parts.push([...selected].join(', '))
    if (text.trim()) parts.push(text.trim())
    onSave(parts.join(' — '))
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {CHIPS.map(chip => (
          <button
            key={chip}
            type="button"
            aria-pressed={selected.has(chip)}
            onClick={() => toggle(chip)}
            style={{
              padding: '10px 16px',
              borderRadius: 24,
              border: `2px solid ${selected.has(chip) ? 'var(--bleu-ciel)' : 'var(--trait)'}`,
              background: selected.has(chip) ? 'rgba(0,123,165,0.1)' : 'var(--surface)',
              color: selected.has(chip) ? 'var(--bleu-ciel)' : 'var(--encre)',
              fontSize: 15,
              minHeight: 44,
            }}
          >
            {chip}
          </button>
        ))}
      </div>
      <textarea
        aria-label="Détails supplémentaires"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Détails supplémentaires…"
        rows={3}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid var(--trait)',
          borderRadius: 8,
          fontSize: 18,
          marginBottom: 16,
          resize: 'none',
          color: 'var(--encre)',
        }}
      />
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          height: 64,
          background: 'var(--bleu-ciel)',
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
