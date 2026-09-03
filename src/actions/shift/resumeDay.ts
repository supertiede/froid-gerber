'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { findShiftByClientKey } from '@/lib/queries/findShiftByClientKey'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function resumeDay(idempotencyKey: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await findShiftByClientKey(idempotencyKey)
  if (existing) return { ok: true as const, data: existing }

  const shift = await prisma.shift.create({
    data: { userId, startAt: now(), startOrigin: 'APP', idempotencyKey },
  })

  revalidatePath('/')
  return { ok: true as const, data: shift }
}
