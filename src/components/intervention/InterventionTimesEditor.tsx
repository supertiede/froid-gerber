'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, LogIn, LogOut, Timer } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { updateIntervention } from '@/actions/intervention/updateIntervention'
import { formatTime } from '@/lib/time/formatTime'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { formatDuration } from '@/lib/time/formatDuration'

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4) // 04 → 23
const MINUTES = [0, 15, 30, 45]

function applyTime(baseISO: string, h: number, m: number): string {
  const result = new Date(baseISO)
  result.setHours(h, m, 0, 0)
  return result.toISOString()
}

const pencilBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  minHeight: 'unset',
  borderRadius: 6,
  border: '1.5px solid var(--trait)',
  background: 'transparent',
  color: 'var(--encre-douce)',
  cursor: 'pointer',
  flexShrink: 0,
}

interface Props {
  interventionId: string
  startAt: string
  endAt: string
}

export function InterventionTimesEditor({ interventionId, startAt, endAt }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<'startAt' | 'endAt' | null>(null)
  const [localStart, setLocalStart] = useState(startAt)
  const [localEnd, setLocalEnd] = useState(endAt)

  const startDate = new Date(localStart)
  const endDate = new Date(localEnd)
  const durationMinutes = diffMinutes(startDate, endDate)

  const [pickerH, setPickerH] = useState(0)
  const [pickerM, setPickerM] = useState(0)

  function openEditor(field: 'startAt' | 'endAt') {
    const d = field === 'startAt' ? startDate : endDate
    setPickerH(d.getHours())
    setPickerM(d.getMinutes())
    setEditing(field)
  }

  function handleSave() {
    if (!editing) return
    const newISO = applyTime(editing === 'startAt' ? localStart : localEnd, pickerH, pickerM)
    startTransition(async () => {
      const result = await updateIntervention(interventionId, editing, newISO)
      if (result.ok) {
        if (editing === 'startAt') setLocalStart(newISO)
        else setLocalEnd(newISO)
        setEditing(null)
        router.refresh()
      }
    })
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottom: '1px solid var(--trait)',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 15,
    color: 'var(--encre-douce)',
    fontWeight: 500,
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, marginBottom: 24 }}>
        <div style={rowStyle}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogIn size={16} /> Heure d&apos;arrivée
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
              {formatTime(startDate)}
            </span>
            <button
              onClick={() => openEditor('startAt')}
              style={pencilBtn}
              aria-label="Modifier l'heure d'arrivée"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <div style={rowStyle}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOut size={16} /> Heure de fin
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
              {formatTime(endDate)}
            </span>
            <button
              onClick={() => openEditor('endAt')}
              style={pencilBtn}
              aria-label="Modifier l'heure de fin"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Timer size={16} /> Durée de l&apos;intervention
          </span>
          <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre-douce)' }}>
            {formatDuration(durationMinutes)}
          </span>
        </div>
      </div>

      <Modal
        open={editing !== null}
        onOpenChange={open => { if (!open) setEditing(null) }}
        title={editing === 'startAt' ? "Modifier l'heure d'arrivée" : "Modifier l'heure de fin"}
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--encre-douce)' }}>Heures</span>
            <select
              value={pickerH}
              onChange={e => setPickerH(Number(e.target.value))}
              style={{
                height: 52,
                borderRadius: 8,
                border: '1.5px solid var(--trait)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--encre)',
                background: 'var(--surface)',
                paddingLeft: 12,
                cursor: 'pointer',
              }}
            >
              {HOURS.map(h => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
              ))}
            </select>
          </label>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 14, fontSize: 24, fontWeight: 700, color: 'var(--encre-douce)' }}>:</div>

          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--encre-douce)' }}>Minutes</span>
            <select
              value={pickerM}
              onChange={e => setPickerM(Number(e.target.value))}
              style={{
                height: 52,
                borderRadius: 8,
                border: '1.5px solid var(--trait)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--encre)',
                background: 'var(--surface)',
                paddingLeft: 12,
                cursor: 'pointer',
              }}
            >
              {MINUTES.map(m => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 10,
            background: 'var(--bleu-ciel)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            border: 'none',
            cursor: isPending ? 'wait' : 'pointer',
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? 'Enregistrement…' : 'Valider'}
        </button>
      </Modal>
    </>
  )
}
