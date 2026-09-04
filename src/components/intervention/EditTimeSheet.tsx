'use client'

import { useState } from 'react'

export function EditTimeSheet({
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
