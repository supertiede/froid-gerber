'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { manualTimestamp } from '@/actions/shift/manualTimestamp'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type EntryType = 'ARRIVAL' | 'DEPARTURE' | 'BREAK' | null

export default function OubliPage() {
  const router = useRouter()
  const [entryType, setEntryType] = useState<EntryType>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakType, setBreakType] = useState<'SHORT' | 'LUNCH'>('SHORT')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!entryType) return

    const result = await manualTimestamp({
      type: entryType,
      startTime: new Date(startTime).toISOString(),
      endTime: entryType === 'BREAK' && endTime ? new Date(endTime).toISOString() : undefined,
      breakType: entryType === 'BREAK' ? breakType : undefined,
      idempotencyKey: uuidv4(),
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 1500)
    }
  }

  const btnType = (label: string, type: EntryType) => (
    <button
      type="button"
      aria-pressed={entryType === type}
      onClick={() => { setEntryType(type); setError('') }}
      style={{
        flex: 1,
        height: 64,
        borderRadius: 12,
        background: entryType === type ? 'var(--acier)' : 'transparent',
        color: entryType === type ? '#fff' : 'var(--acier)',
        fontSize: 15,
        fontWeight: 600,
        border: '2px solid var(--acier)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  if (success) {
    return (
      <div role="status" style={{ padding: 24, textAlign: 'center', color: 'var(--vert)', fontSize: 20, fontWeight: 600 }}>
        Pointage enregistré !
      </div>
    )
  }

  return (
    <div style={{ padding: 24, color: 'var(--encre)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
        Saisie manuelle
      </h1>
      <p style={{ fontSize: 15, color: 'var(--encre-douce)', marginBottom: 24 }}>
        Corrigez ou complétez un pointage oublié (7 jours max).
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {btnType('Arrivée', 'ARRIVAL')}
        {btnType('Départ', 'DEPARTURE')}
        {btnType('Pause', 'BREAK')}
      </div>

      {entryType && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label htmlFor="oubli-start" style={{ fontSize: 16 }}>
              {entryType === 'BREAK' ? 'Début de la pause' : 'Heure'}
            </Label>
            <Input
              id="oubli-start"
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              required
              aria-required="true"
              style={{ height: 56, fontSize: 16 }}
            />
          </div>

          {entryType === 'BREAK' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label htmlFor="oubli-end" style={{ fontSize: 16 }}>Fin de la pause</Label>
                <Input
                  id="oubli-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                  aria-required="true"
                  style={{ height: 56, fontSize: 16 }}
                />
              </div>

              <div role="group" aria-label="Type de pause" style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  aria-pressed={breakType === 'SHORT'}
                  onClick={() => setBreakType('SHORT')}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 8,
                    background: breakType === 'SHORT' ? 'var(--ambre)' : 'transparent',
                    color: breakType === 'SHORT' ? '#fff' : 'var(--ambre)',
                    fontSize: 15,
                    fontWeight: 600,
                    border: '2px solid var(--ambre)',
                    cursor: 'pointer',
                  }}
                >
                  Courte
                </button>
                <button
                  type="button"
                  aria-pressed={breakType === 'LUNCH'}
                  onClick={() => setBreakType('LUNCH')}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 8,
                    background: breakType === 'LUNCH' ? 'var(--ambre)' : 'transparent',
                    color: breakType === 'LUNCH' ? '#fff' : 'var(--ambre)',
                    fontSize: 15,
                    fontWeight: 600,
                    border: '2px solid var(--ambre)',
                    cursor: 'pointer',
                  }}
                >
                  Déjeuner
                </button>
              </div>
            </>
          )}

          {error && (
            <p role="alert" style={{ color: 'var(--rouge)', fontSize: 15 }}>{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            style={{
              height: 64,
              fontSize: 18,
              fontWeight: 600,
              background: 'var(--acier)',
              color: '#fff',
              borderRadius: 12,
            }}
          >
            {loading ? 'Enregistrement…' : 'ENREGISTRER'}
          </Button>
        </form>
      )}
    </div>
  )
}
