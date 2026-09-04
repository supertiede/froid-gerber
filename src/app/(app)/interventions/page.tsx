import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatTime } from '@/lib/time/formatTime'
import { formatDuration } from '@/lib/time/formatDuration'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { interventionMinutes } from '@/lib/calculations/interventionMinutes'
import { toZonedTime, format } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import Link from 'next/link'

const TZ = 'Europe/Paris'

export default async function InterventionsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const interventions = await prisma.intervention.findMany({
    where: { userId: session.user.id },
    include: { client: true },
    orderBy: { startAt: 'desc' },
    take: 100,
  })

  const grouped = new Map<string, typeof interventions>()
  for (const interv of interventions) {
    const dayLabel = format(toZonedTime(interv.startAt, TZ), 'EEEE d MMMM yyyy', {
      timeZone: TZ,
      locale: fr,
    })
    if (!grouped.has(dayLabel)) grouped.set(dayLabel, [])
    grouped.get(dayLabel)!.push(interv)
  }

  if (interventions.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, color: 'var(--encre)' }}>Interventions</h1>
        <p style={{ color: 'var(--encre-douce)', fontSize: 18 }}>
          Aucune intervention enregistrée. Démarrez-en une quand vous arrivez sur site.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 0 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, padding: '0 16px', marginBottom: 16, color: 'var(--encre)' }}>
        Interventions
      </h1>

      {[...grouped.entries()].map(([day, list]) => (
        <div key={day} style={{ marginBottom: 24 }}>
          <h2 style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--encre-douce)',
            padding: '0 16px',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {day}
          </h2>
          {list.map(interv => {
            const duration = interv.endAt ? diffMinutes(interv.startAt, interv.endAt) : null
            const total = interv.endAt ? interventionMinutes({ startAt: interv.startAt, endAt: interv.endAt, travelMinutes: interv.travelMinutes }) : null
            const inProgress = !interv.endAt
            const missingReport = interv.endAt && !interv.workReport

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
                  minHeight: 56,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
                      {interv.type === 'WORKSHOP' ? 'Atelier' : interv.client?.name}
                    </span>
                    {inProgress && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 12,
                        background: 'var(--violet)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        En cours
                      </span>
                    )}
                    {missingReport && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 12,
                        background: 'var(--ambre)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        À compléter
                      </span>
                    )}
                  </div>
                  {total !== null && (
                    <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatDuration(total)}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 15, color: 'var(--encre-douce)' }}>
                  {formatTime(interv.startAt)}
                  {interv.endAt ? ` → ${formatTime(interv.endAt)}` : ''}
                  {duration !== null ? ` · ${formatDuration(duration)}` : ''}
                  {interv.travelMinutes > 0 ? ` + ${formatDuration(interv.travelMinutes)} trajet` : ''}
                </div>
                {interv.workReport && (
                  <div style={{ marginTop: 4, fontSize: 15, color: 'var(--encre-douce)' }}>
                    {interv.workReport.length > 60 ? interv.workReport.slice(0, 60) + '…' : interv.workReport}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
