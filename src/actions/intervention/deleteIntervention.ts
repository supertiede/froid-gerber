'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function deleteIntervention(interventionId: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false, error: 'Intervention not found.' }

  await prisma.intervention.delete({ where: { id: interventionId } })

  revalidatePath('/interventions')
  revalidatePath('/semaine')
  return { ok: true }
}
