import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SemaineView } from '@/components/semaine/SemaineView'
import { getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, addWeeks } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export default async function SemainePage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const { semaine } = await searchParams
  const now = toZonedTime(new Date(), TZ)

  let referenceDate: Date = now
  if (semaine && /^\d{4}-W\d{1,2}$/.test(semaine)) {
    const [yearStr, weekStr] = semaine.split('-W')
    const year = parseInt(yearStr, 10)
    const week = parseInt(weekStr, 10)
    // ISO week 1 is the week containing Jan 4
    const jan4 = new Date(year, 0, 4)
    referenceDate = addWeeks(startOfISOWeek(jan4), week - 1)
  }

  const debutSemaine = startOfISOWeek(referenceDate)
  const finSemaine = endOfISOWeek(referenceDate)
  const semaineIso = `${getISOWeekYear(referenceDate)}-W${String(getISOWeek(referenceDate)).padStart(2, '0')}`

  const [postes, interventions] = await Promise.all([
    prisma.poste.findMany({
      where: { userId: session.user.id, debutAt: { gte: debutSemaine, lte: finSemaine } },
      include: { pauses: true },
      orderBy: { debutAt: 'asc' },
    }),
    prisma.intervention.findMany({
      where: { userId: session.user.id, debutAt: { gte: debutSemaine, lte: finSemaine } },
      include: { client: true },
      orderBy: { debutAt: 'asc' },
    }),
  ])

  return (
    <SemaineView
      semaineIso={semaineIso}
      debutSemaine={debutSemaine.toISOString()}
      postes={postes.map(p => ({
        ...p,
        debutAt: p.debutAt.toISOString(),
        finAt: p.finAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        pauses: p.pauses.map(pause => ({
          ...pause,
          debutAt: pause.debutAt.toISOString(),
          finAt: pause.finAt?.toISOString() ?? null,
          createdAt: pause.createdAt.toISOString(),
          updatedAt: pause.updatedAt.toISOString(),
        })),
      }))}
      interventions={interventions.map(i => ({
        ...i,
        debutAt: i.debutAt.toISOString(),
        finAt: i.finAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        client: i.client
          ? {
              id: i.client.id,
              nom: i.client.nom,
              nomNormalise: i.client.nomNormalise,
              actif: i.client.actif,
              createdAt: i.client.createdAt.toISOString(),
              creeParId: i.client.creeParId,
            }
          : null,
      }))}
    />
  )
}
