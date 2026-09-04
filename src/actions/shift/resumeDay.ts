'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfDay } from 'date-fns'

const TZ = 'Europe/Paris'

export async function resumeDay() {
  const session = await getSession()
  const userId = session.user.id

  // If there's already an open shift, nothing to do (already resumed)
  const openShift = await prisma.shift.findFirst({ where: { userId, endAt: null } })
  if (openShift) return { ok: true as const }

  // Reopen the most recently closed shift, but only if it started today (Paris time)
  const todayStart = fromZonedTime(startOfDay(toZonedTime(new Date(), TZ)), TZ)

  const closedShift = await prisma.shift.findFirst({
    where: { userId, endAt: { not: null }, startAt: { gte: todayStart } },
    orderBy: { startAt: 'desc' },
  })
  if (!closedShift) return { ok: false as const, error: 'Aucun poste à reprendre pour aujourd\'hui.' }

  await prisma.shift.update({
    where: { id: closedShift.id },
    data: { endAt: null, endOrigin: null },
  })

  revalidatePath('/')
  return { ok: true as const }
}
