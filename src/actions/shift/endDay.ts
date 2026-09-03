'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { getOpenIntervention } from '@/lib/queries/getOpenIntervention'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function endDay() {
  const session = await getSession()
  const userId = session.user.id

  const shift = await getOpenShift(userId)
  if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }

  const openIntervention = await getOpenIntervention(userId)
  if (openIntervention) return { ok: false as const, error: "Terminez d'abord votre intervention en cours." }

  await prisma.shift.update({
    where: { id: shift.id },
    data: { endAt: now(), endOrigin: 'APP' },
  })

  revalidatePath('/')
  return { ok: true as const }
}
