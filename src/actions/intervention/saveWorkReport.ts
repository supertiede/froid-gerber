'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function saveWorkReport(interventionId: string, workReport: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false as const, error: 'Intervention not found.' }

  await prisma.intervention.update({
    where: { id: interventionId },
    data: { workReport },
  })

  revalidatePath(`/intervention/${interventionId}`)
  revalidatePath('/interventions')
  return { ok: true as const }
}
