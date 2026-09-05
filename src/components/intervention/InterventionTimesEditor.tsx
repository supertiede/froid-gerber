'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, LogIn, LogOut, Timer, Coffee } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { updateIntervention } from '@/actions/intervention/updateIntervention'
import { formatTime } from '@/lib/time/formatTime'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { formatDuration } from '@/lib/time/formatDuration'

const HOURS = Array.from({ length: 20 }, (_, i) => i + 4) // 04 → 23
const PAUSE_HOURS = [0, 1, 2, 3]
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

const selectStyle: React.CSSProperties = {
  height: 52,
  borderRadius: 8,
  border: '1.5px solid var(--trait)',
  fontSize: 20,
  fontWeight: 600,
  color: 'var(--encre)',
  background: 'var(--surface)',
  paddingLeft: 12,
  cursor: 'pointer',
}

interface Props {
  interventionId: string
  startAt: string
  endAt: string
  pauseMinutes: number
}

export function InterventionTimesEditor({ interventionId, startAt, endAt, pauseMinutes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<'startAt' | 'endAt' | 'pauseMinutes' | null>(null)
  const [localStart, setLocalStart] = useState(startAt)
  const [localEnd, setLocalEnd] = useState(endAt)
  const [localPause, setLocalPause] = useState(() => Number.isFinite(pauseMinutes) ? pauseMinutes : 0)
  const [saveError, setSaveError] = useState<string | null>(null)

  const startDate = new Date(localStart)
  const endDate = new Date(localEnd)
  const totalMinutes = diffMinutes(startDate, endDate)
  const netMinutes = Math.max(0, totalMinutes - localPause)

  const [pickerH, setPickerH] = useState(0)
  const [pickerM, setPickerM] = useState(0)
  const [pickerPauseH, setPickerPauseH] = useState(0)
  const [pickerPauseM, setPickerPauseM] = useState(15)

  function openEditor(field: 'startAt' | 'endAt' | 'pauseMinutes') {
    setSaveError(null)
    if (field === 'pauseMinutes') {
      if (localPause === 0) {
        setPickerPauseH(0)
        setPickerPauseM(15)
      } else {
        setPickerPauseH(Math.floor(localPause / 60))
        setPickerPauseM(localPause % 60)
      }
      setEditing('pauseMinutes')
    } else {
      const d = field === 'startAt' ? startDate : endDate
      setPickerH(d.getHours())
      setPickerM(d.getMinutes())
      setEditing(field)
    }
  }

  function handleSave() {
    if (!editing) return
    setSaveError(null)
    if (editing === 'pauseMinutes') {
      const totalPause = pickerPauseH * 60 + pickerPauseM
      startTransition(async () => {
        const result = await updateIntervention(interventionId, 'pauseMinutes', String(totalPause))
        if (result.ok) {
          setLocalPause(totalPause)
          setEditing(null)
          router.refresh()
        } else {
          setSaveError(result.error ?? 'Erreur')
        }
      })
    } else {
      const field = editing
      const newISO = applyTime(field === 'startAt' ? localStart : localEnd, pickerH, pickerM)
      startTransition(async () => {
        const result = await updateIntervention(interventionId, field, newISO)
        if (result.ok) {
          if (field === 'startAt') setLocalStart(newISO)
          else setLocalEnd(newISO)
          setEditing(null)
          router.refresh()
        } else {
          setSaveError(result.error ?? 'Erreur')
        }
      })
    }
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

        <div style={rowStyle}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Coffee size={16} /> Pause
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
              {localPause === 0 ? '—' : formatDuration(localPause)}
            </span>
            <button
              onClick={() => openEditor('pauseMinutes')}
              style={pencilBtn}
              aria-label="Modifier la pause"
            >
              <Pencil size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Timer size={16} /> Durée nette
          </span>
          <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre-douce)' }}>
            {formatDuration(netMinutes)}
          </span>
        </div>
      </div>

      <Modal
        open={editing !== null}
        onOpenChange={open => { if (!open) { setEditing(null); setSaveError(null) } }}
        title={
          editing === 'startAt' ? "Modifier l'heure d'arrivée" :
          editing === 'endAt' ? "Modifier l'heure de fin" :
          "Modifier la pause"
        }
      >
        {editing === 'pauseMinutes' ? (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--encre-douce)' }}>Heures</span>
              <select
                value={pickerPauseH}
                onChange={e => setPickerPauseH(Number(e.target.value))}
                style={selectStyle}
              >
                {PAUSE_HOURS.map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 14, fontSize: 24, fontWeight: 700, color: 'var(--encre-douce)' }}>:</div>

            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--encre-douce)' }}>Minutes</span>
              <select
                value={pickerPauseM}
                onChange={e => setPickerPauseM(Number(e.target.value))}
                style={selectStyle}
              >
                {MINUTES.map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--encre-douce)' }}>Heures</span>
              <select
                value={pickerH}
                onChange={e => setPickerH(Number(e.target.value))}
                style={selectStyle}
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
                style={selectStyle}
              >
                {MINUTES.map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {saveError && (
          <p style={{ fontSize: 14, color: 'var(--rouge)', marginBottom: 12, marginTop: -12 }}>
            {saveError}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={isPending}
          aria-busy={isPending}
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
            touchAction: 'manipulation',
          }}
        >
          {isPending ? 'Enregistrement…' : 'Valider'}
        </button>
      </Modal>
    </>
  )
}
