import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatHeure, formatDuree, diffMinutes } from '@/lib/temps'
import { tempsInterventionMinutes } from '@/lib/calculs'
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
    orderBy: { debutAt: 'desc' },
    take: 100,
  })

  // Group by day (Paris time)
  const groupes = new Map<string, typeof interventions>()
  for (const interv of interventions) {
    const jourLabel = format(toZonedTime(interv.debutAt, TZ), 'EEEE d MMMM yyyy', {
      timeZone: TZ,
      locale: fr,
    })
    if (!groupes.has(jourLabel)) groupes.set(jourLabel, [])
    groupes.get(jourLabel)!.push(interv)
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

      {[...groupes.entries()].map(([jour, list]) => (
        <div key={jour} style={{ marginBottom: 24 }}>
          <h2 style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--encre-douce)',
            padding: '0 16px',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {jour}
          </h2>
          {list.map(interv => {
            const duree = interv.finAt ? diffMinutes(interv.debutAt, interv.finAt) : null
            const total = interv.finAt ? tempsInterventionMinutes(interv) : null
            const enCours = !interv.finAt
            const sansCompteRendu = interv.finAt && !interv.compteRendu

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
                      {interv.type === 'ATELIER' ? 'Atelier' : interv.client?.nom}
                    </span>
                    {enCours && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 12,
                        background: 'var(--cuivre)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}>
                        En cours
                      </span>
                    )}
                    {sansCompteRendu && (
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
                      {formatDuree(total)}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 15, color: 'var(--encre-douce)' }}>
                  {formatHeure(interv.debutAt)}
                  {interv.finAt ? ` → ${formatHeure(interv.finAt)}` : ''}
                  {duree !== null ? ` · ${formatDuree(duree)}` : ''}
                  {interv.trajetMinutes > 0 ? ` + ${formatDuree(interv.trajetMinutes)} trajet` : ''}
                </div>
                {interv.compteRendu && (
                  <div style={{ marginTop: 4, fontSize: 15, color: 'var(--encre-douce)' }}>
                    {interv.compteRendu.length > 60 ? interv.compteRendu.slice(0, 60) + '…' : interv.compteRendu}
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
