'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { findShiftByClientKey } from '@/lib/queries/findShiftByClientKey'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'
import type { ManualTimestampInput } from '@/types/ManualTimestampInput'

export async function manualTimestamp(data: ManualTimestampInput) {
  const session = await getSession()
  const userId = session.user.id
  const currentTime = now()

  const start = new Date(data.startTime)
  if (start > currentTime) return { ok: false as const, error: "L'heure ne peut pas être dans le futur." }
  if (currentTime.getTime() - start.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return { ok: false as const, error: 'Impossible de saisir une heure de plus de 7 jours.' }
  }

  if (data.type === 'ARRIVAL') {
    const existing = await findShiftByClientKey(data.idempotencyKey)
    if (existing) return { ok: true as const }
    await prisma.shift.create({
      data: { userId, startAt: start, startOrigin: 'MANUAL', idempotencyKey: data.idempotencyKey },
    })
  }

  if (data.type === 'DEPARTURE') {
    const shift = await getOpenShift(userId)
    if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }
    await prisma.shift.update({
      where: { id: shift.id },
      data: { endAt: start, endOrigin: 'MANUAL' },
    })
  }

  if (data.type === 'BREAK' && data.endTime && data.breakType) {
    const end = new Date(data.endTime)
    const shift = await getOpenShift(userId)
    if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }
    const existing = await prisma.break.findUnique({ where: { idempotencyKey: data.idempotencyKey } })
    if (existing) return { ok: true as const }
    await prisma.break.create({
      data: {
        shiftId: shift.id,
        type: data.breakType,
        startAt: start,
        endAt: end,
        startOrigin: 'MANUAL',
        endOrigin: 'MANUAL',
        idempotencyKey: data.idempotencyKey,
      },
    })
  }

  revalidatePath('/')
  return { ok: true as const }
}
