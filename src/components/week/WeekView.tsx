'use client'

import { useRouter } from 'next/navigation'
import {
  addWeeks,
  subWeeks,
  getISOWeek,
  getISOWeekYear,
  eachDayOfInterval,
  format,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, LogIn, LogOut, Coffee } from 'lucide-react'
import { formatDuration } from '@/lib/time/formatDuration'
import { formatTime } from '@/lib/time/formatTime'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { breaksDuration } from '@/lib/calculations/breaksDuration'
import { workedMinutes } from '@/lib/calculations/workedMinutes'

const TZ = 'Europe/Paris'

type BreakSer = {
  id: string
  type: string
  startAt: string
  endAt: string | null
}

type ShiftSer = {
  id: string
  startAt: string
  endAt: string | null
  breaks: BreakSer[]
}

function toIsoWeek(date: Date) {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

export function WeekView({
  isoWeek,
  weekStart,
  shifts,
}: {
  isoWeek: string
  weekStart: string
  shifts: ShiftSer[]
}) {
  const router = useRouter()
  const debut = new Date(weekStart)

  const navigate = (offset: number) => {
    const d = offset < 0 ? subWeeks(debut, 1) : addWeeks(debut, 1)
    router.push(`/semaine?semaine=${toIsoWeek(d)}`)
  }

  const jours = eachDayOfInterval({ start: debut, end: addWeeks(debut, 1) }).slice(0, 7)
  let totalSemaine = 0

  const joursAvecShift = jours
    .map(jour => {
      const jourStr = format(toZonedTime(jour, TZ), 'yyyy-MM-dd')
      const shift =
        shifts.find(
          s => format(toZonedTime(new Date(s.startAt), TZ), 'yyyy-MM-dd') === jourStr,
        ) ?? null
      return { jour, jourStr, shift }
    })
    .filter(({ shift }) => shift !== null)

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Navigation semaine */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        borderBottom: '1px solid var(--trait)',
        background: 'var(--surface)',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Semaine précédente"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <ChevronLeft size={24} />
        </button>

        <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--encre)' }}>
          Semaine {isoWeek.split('-W')[1]}
        </h1>

        <button
          onClick={() => navigate(1)}
          aria-label="Semaine suivante"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {joursAvecShift.length === 0 && (
        <p style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--encre-douce)', fontSize: 16 }}>
          Aucune journée enregistrée cette semaine.
        </p>
      )}

      {joursAvecShift.map(({ jour, jourStr, shift }) => {
        const s = shift!
        const breaksConv = s.breaks.map(b => ({
          startAt: new Date(b.startAt),
          endAt: b.endAt ? new Date(b.endAt) : null,
        }))
        const shiftConv = {
          startAt: new Date(s.startAt),
          endAt: s.endAt ? new Date(s.endAt) : null,
        }

        const worked = workedMinutes(shiftConv, breaksConv)
        const inProgress = !s.endAt

        if (shiftConv.endAt) totalSemaine += worked

        const closedBreaks = breaksConv.filter(b => b.endAt)
        const pauseMinutes = breaksDuration(closedBreaks)

        return (
          <div
            key={jourStr}
            style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--trait)',
              padding: '14px 16px',
            }}
          >
            {/* Jour + total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--encre-douce)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {format(toZonedTime(jour, TZ), 'EEEE d MMM', { locale: fr })}
              </span>
              <span style={{
                fontSize: 22,
                fontWeight: 700,
                color: inProgress ? 'var(--ambre)' : 'var(--encre)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {worked > 0 ? formatDuration(worked) : '—'}
                {inProgress ? ' ⏳' : ''}
              </span>
            </div>

            {/* Arrivée → Départ */}
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogIn size={14} color="var(--encre-douce)" />
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatTime(shiftConv.startAt)}
                </span>
              </div>

              <span style={{ color: 'var(--encre-douce)', alignSelf: 'center' }}>→</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={14} color="var(--encre-douce)" />
                <span style={{ fontSize: 16, fontWeight: 600, color: shiftConv.endAt ? 'var(--encre)' : 'var(--encre-douce)', fontVariantNumeric: 'tabular-nums' }}>
                  {shiftConv.endAt ? formatTime(shiftConv.endAt) : 'en cours'}
                </span>
              </div>

              {pauseMinutes > 0 && (
                <>
                  <span style={{ color: 'var(--encre-douce)', alignSelf: 'center' }}>·</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Coffee size={14} color="var(--encre-douce)" />
                    <span style={{ fontSize: 15, color: 'var(--encre-douce)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(pauseMinutes)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}

      {/* Total semaine */}
      {totalSemaine > 0 && (
        <div style={{
          margin: '20px 16px 0',
          padding: '16px 20px',
          background: 'var(--bleu-ciel)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>Total semaine</span>
          <span style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatDuration(totalSemaine)}
          </span>
        </div>
      )}

    </div>
  )
}
