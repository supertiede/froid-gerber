'use client'

import { useState } from 'react'

export function EditTrajetSheet({
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
