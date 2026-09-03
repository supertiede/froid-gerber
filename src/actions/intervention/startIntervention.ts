'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { clockIn } from '@/actions/shift/clockIn'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function startIntervention(data: {
  type: 'CLIENT' | 'WORKSHOP'
  clientId?: string
  travelMinutes: number
  idempotencyKey: string
}) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await prisma.intervention.findUnique({ where: { idempotencyKey: data.idempotencyKey } })
  if (existing) return { ok: true as const, data: existing }

  const openIntervention = await prisma.intervention.findFirst({ where: { userId, endAt: null } })
  if (openIntervention) return { ok: false as const, error: 'Une intervention est déjà en cours.' }

  const shift = await getOpenShift(userId)
  if (!shift) await clockIn(uuidv4())

  const intervention = await prisma.intervention.create({
    data: {
      userId,
      type: data.type,
      clientId: data.type === 'CLIENT' ? data.clientId : null,
      travelMinutes: data.travelMinutes,
      startAt: now(),
      origin: 'APP',
      idempotencyKey: data.idempotencyKey,
    },
  })

  revalidatePath('/')
  revalidatePath('/interventions')
  return { ok: true as const, data: intervention }
}
