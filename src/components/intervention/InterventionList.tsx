'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { toZonedTime, format } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { formatTime } from '@/lib/time/formatTime'
import { formatDuration } from '@/lib/time/formatDuration'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { interventionMinutes } from '@/lib/calculations/interventionMinutes'
import { type InterventionRow } from '@/lib/interventions/types'
import { fetchMoreInterventions } from '@/actions/intervention/fetchMoreInterventions'

const TZ = 'Europe/Paris'

function groupByDay(items: InterventionRow[]): [string, InterventionRow[]][] {
  const map = new Map<string, InterventionRow[]>()
  for (const item of items) {
    const key = format(toZonedTime(new Date(item.startAt), TZ), 'EEEE d MMMM yyyy', {
      timeZone: TZ,
      locale: fr,
    })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
}

type Props = {
  initialItems: InterventionRow[]
  initialNextCursor: string | null
}

export function InterventionList({ initialItems, initialNextCursor }: Props) {
  const [items, setItems] = useState(initialItems)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const cursorRef = useRef(initialNextCursor)
  cursorRef.current = nextCursor
  const sentinelRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupByDay(items), [items])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursorRef.current) return
    loadingRef.current = true
    setLoading(true)
    const result = await fetchMoreInterventions(cursorRef.current)
    setItems(prev => [...prev, ...result.items])
    setNextCursor(result.nextCursor)
    loadingRef.current = false
    setLoading(false)
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) void loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  if (items.length === 0) {
    return (
      <p style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--encre-douce)', fontSize: 16 }}>
        Aucune intervention enregistrée.
      </p>
    )
  }

  return (
    <div>
      {groups.map(([day, list]) => (
        <div key={day}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--encre-douce)',
            padding: '16px 16px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {day}
          </h2>

          {list.map(interv => {
            const start = new Date(interv.startAt)
            const end = interv.endAt ? new Date(interv.endAt) : null
            const duration = end ? diffMinutes(start, end) : null
            const total = end
              ? interventionMinutes({ startAt: start, endAt: end, travelMinutes: interv.travelMinutes })
              : null
            const inProgress = !interv.endAt
            const missingReport = !!interv.endAt && !interv.workReport

            return (
              <Link
                key={interv.id}
                href={`/intervention/${interv.id}`}
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--trait)',
                  textDecoration: 'none',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--encre)' }}>
                      {interv.type === 'WORKSHOP' ? 'Atelier' : interv.client?.name ?? '—'}
                    </span>
                    {inProgress && (
                      <span style={{ fontSize: 11, background: 'var(--violet)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        En cours
                      </span>
                    )}
                    {missingReport && (
                      <span style={{ fontSize: 11, background: 'var(--ambre)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        À compléter
                      </span>
                    )}
                  </div>
                  {total !== null && (
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--encre)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {formatDuration(total)}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 4, fontSize: 14, color: 'var(--encre-douce)' }}>
                  {formatTime(start)}
                  {end ? ` → ${formatTime(end)}` : ''}
                  {duration !== null ? ` · ${formatDuration(duration)}` : ''}
                  {interv.travelMinutes > 0 ? ` + ${formatDuration(interv.travelMinutes * 2)} trajet` : ''}
                </div>

                {interv.workReport && (
                  <div style={{ marginTop: 4, fontSize: 14, color: 'var(--encre-douce)' }}>
                    {interv.workReport.length > 60
                      ? interv.workReport.slice(0, 60) + '…'
                      : interv.workReport}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      ))}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && (
        <p style={{ padding: '16px', textAlign: 'center', color: 'var(--encre-douce)', fontSize: 14 }}>
          Chargement…
        </p>
      )}

      {!loading && !nextCursor && items.length > 0 && (
        <p style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--encre-douce)', fontSize: 13 }}>
          Toutes les interventions sont chargées.
        </p>
      )}
    </div>
  )
}
