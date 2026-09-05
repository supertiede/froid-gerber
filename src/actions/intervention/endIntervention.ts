'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { now } from '@/lib/time/now'
import { roundToQuarter } from '@/lib/time/roundToQuarter'
import { revalidatePath } from 'next/cache'

export async function endIntervention(interventionId: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false as const, error: 'Intervention not found.' }
  if (intervention.endAt) return { ok: true as const }

  await prisma.intervention.update({
    where: { id: interventionId },
    data: {
      startAt: roundToQuarter(intervention.startAt),
      endAt: roundToQuarter(now()),
    },
  })

  revalidatePath('/')
  revalidatePath('/interventions')
  revalidatePath(`/intervention/${interventionId}`)
  return { ok: true as const }
}
