import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfDay, getHours } from 'date-fns'

export const runtime = 'nodejs'
export const maxDuration = 60

const TZ = 'Europe/Paris'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowParis = toZonedTime(new Date(), TZ)
  if (getHours(nowParis) !== 0) {
    return NextResponse.json({ message: 'Hors fenêtre de déclenchement' })
  }

  // Exact UTC timestamp of midnight Paris (00:00:00)
  const midnight = fromZonedTime(startOfDay(nowParis), TZ)

  // All shifts open before midnight (started on a previous day)
  const openShifts = await prisma.shift.findMany({
    where: { endAt: null, startAt: { lt: midnight } },
    include: { breaks: { where: { endAt: null } } },
  })

  let rolled = 0

  for (const shift of openShifts) {
    // Close any open breaks at midnight
    for (const brk of shift.breaks) {
      await prisma.break.update({
        where: { id: brk.id },
        data: { endAt: midnight, endOrigin: 'APP' },
      })
    }

    // Close any open interventions at midnight
    await prisma.intervention.updateMany({
      where: { userId: shift.userId, endAt: null },
      data: { endAt: midnight },
    })

    // Close the shift at midnight
    await prisma.shift.update({
      where: { id: shift.id },
      data: { endAt: midnight, endOrigin: 'APP' },
    })

    // Create new shift starting at midnight (idempotent: skip if one already exists)
    const existingNew = await prisma.shift.findFirst({
      where: { userId: shift.userId, startAt: { gte: midnight } },
    })
    if (!existingNew) {
      await prisma.shift.create({
        data: { userId: shift.userId, startAt: midnight, startOrigin: 'APP' },
      })
    }

    rolled++
  }

  console.log(`[midnight-rollover] ${rolled} shift(s) basculé(s) à minuit`)
  return NextResponse.json({ ok: true, rolled })
}
