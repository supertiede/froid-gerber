import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { startOfDayParis } from '@/lib/time/startOfDayParis'
import { endOfDayParis } from '@/lib/time/endOfDayParis'
import { now } from '@/lib/time/now'
import { calculerEtat } from '@/lib/etat-journee'
import { DayScreen } from '@/components/day/DayScreen'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  if (session.user.mustChangePassword) {
    redirect('/changer-mot-de-passe')
  }

  const userId = session.user.id
  const today = now()
  const dayStart = startOfDayParis(today)
  const dayEnd = endOfDayParis(today)

  const [shift, openIntervention] = await Promise.all([
    prisma.shift.findFirst({
      where: { userId, startAt: { gte: dayStart, lte: dayEnd } },
      include: { breaks: true },
      orderBy: { startAt: 'desc' },
    }),
    prisma.intervention.findFirst({
      where: { userId, endAt: null },
      include: { client: true },
    }),
  ])

  const status = calculerEtat(shift, openIntervention)
  const openBreak = shift?.breaks.find(b => !b.endAt) ?? null

  let chronoStartAt: number | null = null
  if (status === 'AU_TRAVAIL') chronoStartAt = shift!.startAt.getTime()
  if (status === 'PAUSE_DEJEUNER') chronoStartAt = openBreak!.startAt.getTime()
  if (status === 'EN_INTERVENTION') chronoStartAt = openIntervention!.startAt.getTime()

  return (
    <DayScreen
      status={status}
      shift={shift ? {
        id: shift.id,
        userId: shift.userId,
        startAt: shift.startAt.toISOString(),
        endAt: shift.endAt?.toISOString() ?? null,
        startOrigin: shift.startOrigin,
        endOrigin: shift.endOrigin ?? null,
        idempotencyKey: shift.idempotencyKey ?? null,
        createdAt: shift.createdAt.toISOString(),
        updatedAt: shift.updatedAt.toISOString(),
        breaks: shift.breaks.map(b => ({
          id: b.id,
          shiftId: b.shiftId,
          type: b.type,
          startAt: b.startAt.toISOString(),
          endAt: b.endAt?.toISOString() ?? null,
          startOrigin: b.startOrigin,
          endOrigin: b.endOrigin ?? null,
          idempotencyKey: b.idempotencyKey ?? null,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        })),
      } : null}
      openIntervention={openIntervention ? {
        id: openIntervention.id,
        userId: openIntervention.userId,
        type: openIntervention.type,
        clientId: openIntervention.clientId,
        startAt: openIntervention.startAt.toISOString(),
        endAt: openIntervention.endAt?.toISOString() ?? null,
        travelMinutes: openIntervention.travelMinutes,
        workReport: openIntervention.workReport,
        origin: openIntervention.origin,
        idempotencyKey: openIntervention.idempotencyKey ?? null,
        createdAt: openIntervention.createdAt.toISOString(),
        updatedAt: openIntervention.updatedAt.toISOString(),
        client: openIntervention.client ? {
          id: openIntervention.client.id,
          name: openIntervention.client.name,
        } : null,
      } : null}
      openBreak={openBreak ? {
        id: openBreak.id,
        shiftId: openBreak.shiftId,
        type: openBreak.type,
        startAt: openBreak.startAt.toISOString(),
        endAt: openBreak.endAt?.toISOString() ?? null,
        startOrigin: openBreak.startOrigin,
        endOrigin: openBreak.endOrigin ?? null,
        idempotencyKey: openBreak.idempotencyKey ?? null,
        createdAt: openBreak.createdAt.toISOString(),
        updatedAt: openBreak.updatedAt.toISOString(),
      } : null}
      chronoStartAt={chronoStartAt}
      userName={session.user.name}
    />
  )
}
