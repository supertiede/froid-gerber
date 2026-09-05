'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function startBreak(type: 'LUNCH', idempotencyKey: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await prisma.break.findUnique({ where: { idempotencyKey } })
  if (existing) return { ok: true as const, data: existing }

  const shift = await getOpenShift(userId)
  if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }
  if (shift.breaks.find(b => !b.endAt)) return { ok: false as const, error: 'Une pause est déjà en cours.' }

  const breakRecord = await prisma.break.create({
    data: { shiftId: shift.id, type, startAt: now(), startOrigin: 'APP', idempotencyKey },
  })

  revalidatePath('/')
  return { ok: true as const, data: breakRecord }
}
