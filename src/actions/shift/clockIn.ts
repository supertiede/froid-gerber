'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { findShiftByClientKey } from '@/lib/queries/findShiftByClientKey'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function clockIn(idempotencyKey: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await findShiftByClientKey(idempotencyKey)
  if (existing) return { ok: true as const, data: existing }

  const openShift = await getOpenShift(userId)
  if (openShift) return { ok: false as const, error: 'Vous êtes déjà au travail.' }

  const shift = await prisma.shift.create({
    data: { userId, startAt: now(), startOrigin: 'APP', idempotencyKey },
  })

  revalidatePath('/')
  return { ok: true as const, data: shift }
}
