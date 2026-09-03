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
import { formatDuration } from '@/lib/time/formatDuration'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { workedMinutes } from '@/lib/calculations/workedMinutes'
import { interventionMinutes } from '@/lib/calculations/interventionMinutes'
import Link from 'next/link'

const TZ = 'Europe/Paris'

type ClientSer = {
  id: string
  name: string
  normalizedName: string
  active: boolean
  createdAt: string
  createdById: string | null
}

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

type InterventionSer = {
  id: string
  type: 'CLIENT' | 'WORKSHOP'
  startAt: string
  endAt: string | null
  travelMinutes: number
  workReport: string | null
  client: ClientSer | null
}

function toIsoWeek(date: Date) {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

export function WeekView({
  isoWeek,
  weekStart,
  shifts,
  interventions,
}: {
  isoWeek: string
  weekStart: string
  shifts: ShiftSer[]
  interventions: InterventionSer[]
}) {
  const router = useRouter()
  const debut = new Date(weekStart)

  const navigate = (offset: number) => {
    const d = offset < 0 ? subWeeks(debut, 1) : addWeeks(debut, 1)
    router.push(`/semaine?semaine=${toIsoWeek(d)}`)
  }

  const jours = eachDayOfInterval({ start: debut, end: addWeeks(debut, 1) }).slice(0, 7)
  let totalSemaine = 0

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Navigation */}
      <div
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--trait)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: 28,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            minHeight: 'auto',
            padding: '4px 12px',
          }}
        >
          ‹
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
          Semaine {isoWeek.split('-W')[1]}
        </h1>
        <button
          onClick={() => navigate(1)}
          style={{
            fontSize: 28,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            minHeight: 'auto',
            padding: '4px 12px',
          }}
        >
          ›
        </button>
      </div>

      {jours.map(jour => {
        const jourStr = format(toZonedTime(jour, TZ), 'yyyy-MM-dd')

        const shift =
          shifts.find(
            s => format(toZonedTime(new Date(s.startAt), TZ), 'yyyy-MM-dd') === jourStr,
          ) ?? null

        const intervJour = interventions.filter(
          i => format(toZonedTime(new Date(i.startAt), TZ), 'yyyy-MM-dd') === jourStr,
        )

        if (!shift && intervJour.length === 0) return null

        const breaksConv = (shift?.breaks ?? []).map(b => ({
          startAt: new Date(b.startAt),
          endAt: b.endAt ? new Date(b.endAt) : null,
        }))

        const shiftConv = shift
          ? {
              startAt: new Date(shift.startAt),
              endAt: shift.endAt ? new Date(shift.endAt) : null,
            }
          : null

        const workedMins = shiftConv ? workedMinutes(shiftConv, breaksConv) : 0
        if (shiftConv?.endAt) totalSemaine += workedMins

        const tempsInterv = intervJour
          .filter(i => i.endAt)
          .reduce(
            (acc, i) =>
              acc +
              interventionMinutes({
                startAt: new Date(i.startAt),
                endAt: new Date(i.endAt!),
                travelMinutes: i.travelMinutes,
              }),
            0,
          )

        const ecart = workedMins - tempsInterv
        const aEcart = shiftConv?.endAt && Math.abs(ecart) > 30

        return (
          <div key={jourStr}>
            {/* Day header */}
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--trait)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--encre-douce)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {format(toZonedTime(jour, TZ), 'EEEE d MMM', { locale: fr })}
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--encre)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {workedMins > 0 ? formatDuration(workedMins) : '—'}
                {shiftConv && !shiftConv.endAt && ' ⏳'}
              </span>
            </div>

            {/* Shift summary line */}
            {shift && (
              <div
                style={{
                  padding: '6px 16px',
                  fontSize: 15,
                  color: 'var(--encre-douce)',
                  borderBottom: '1px solid var(--trait)',
                }}
              >
                {format(toZonedTime(new Date(shift.startAt), TZ), 'HH:mm')}
                {shift.endAt
                  ? ` → ${format(toZonedTime(new Date(shift.endAt), TZ), 'HH:mm')}`
                  : ' → en cours'}
                {breaksConv.filter(b => b.endAt).length > 0 &&
                  ` · pauses ${formatDuration(
                    breaksConv
                      .filter(b => b.endAt)
                      .reduce((a, b) => a + diffMinutes(b.startAt, b.endAt!), 0),
                  )}`}
              </div>
            )}

            {/* Interventions */}
            {intervJour.map(i => {
              const t = i.endAt
                ? interventionMinutes({
                    startAt: new Date(i.startAt),
                    endAt: new Date(i.endAt),
                    travelMinutes: i.travelMinutes,
                  })
                : null
              return (
                <Link
                  key={i.id}
                  href={`/intervention/${i.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--trait)',
                    textDecoration: 'none',
                    minHeight: 56,
                  }}
                >
                  <span style={{ fontSize: 18, color: 'var(--encre)' }}>
                    {i.type === 'WORKSHOP' ? 'Atelier' : i.client?.name}
                    {!i.workReport && i.endAt && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ambre)' }}>●</span>
                    )}
                  </span>
                  {t !== null && (
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: 'var(--encre)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatDuration(t)}
                    </span>
                  )}
                </Link>
              )
            })}

            {/* Écart warning */}
            {aEcart && (
              <div
                style={{
                  padding: '8px 16px',
                  background: 'rgba(138,90,18,0.08)',
                  borderBottom: '1px solid var(--trait)',
                  fontSize: 15,
                  color: 'var(--ambre)',
                }}
              >
                ⚠ {Math.abs(ecart)} min non affectées — vérifiez vos interventions
              </div>
            )}
          </div>
        )
      })}

      {/* Week total */}
      <div
        style={{
          margin: '24px 16px',
          padding: '16px 20px',
          background: 'var(--acier)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 18, color: '#fff' }}>Total semaine</span>
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatDuration(totalSemaine)}
        </span>
      </div>
    </div>
  )
}
