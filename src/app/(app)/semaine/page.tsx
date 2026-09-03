import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { WeekView } from '@/components/week/WeekView'
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
    const jan4 = new Date(year, 0, 4)
    referenceDate = addWeeks(startOfISOWeek(jan4), week - 1)
  }

  const weekStart = startOfISOWeek(referenceDate)
  const weekEnd = endOfISOWeek(referenceDate)
  const isoWeek = `${getISOWeekYear(referenceDate)}-W${String(getISOWeek(referenceDate)).padStart(2, '0')}`

  const [shifts, interventions] = await Promise.all([
    prisma.shift.findMany({
      where: { userId: session.user.id, startAt: { gte: weekStart, lte: weekEnd } },
      include: { breaks: true },
      orderBy: { startAt: 'asc' },
    }),
    prisma.intervention.findMany({
      where: { userId: session.user.id, startAt: { gte: weekStart, lte: weekEnd } },
      include: { client: true },
      orderBy: { startAt: 'asc' },
    }),
  ])

  return (
    <WeekView
      isoWeek={isoWeek}
      weekStart={weekStart.toISOString()}
      shifts={shifts.map(s => ({
        id: s.id,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt?.toISOString() ?? null,
        breaks: s.breaks.map(b => ({
          id: b.id,
          type: b.type,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt?.toISOString() ?? null,
        })),
      }))}
      interventions={interventions.map(i => ({
        id: i.id,
        type: i.type,
        startAt: i.startAt.toISOString(),
        endAt: i.endAt?.toISOString() ?? null,
        travelMinutes: i.travelMinutes,
        workReport: i.workReport,
        client: i.client ? {
          id: i.client.id,
          name: i.client.name,
        } : null,
      }))}
    />
  )
}
