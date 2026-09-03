'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'
import type { InterventionField } from '@/types/InterventionField'

export async function updateIntervention(
  interventionId: string,
  field: InterventionField,
  newValue: string,
  reason?: string
) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false, error: 'Intervention not found.' }

  let updateData: Record<string, unknown> = {}
  const oldValue = String(intervention[field as keyof typeof intervention] ?? '')

  switch (field) {
    case 'startAt':
    case 'endAt':
      updateData[field] = new Date(newValue)
      break
    case 'travelMinutes':
      updateData[field] = parseInt(newValue, 10)
      break
    case 'clientId':
      updateData.clientId = newValue || null
      updateData.type = newValue ? 'CLIENT' : 'WORKSHOP'
      break
    case 'type':
      updateData.type = newValue
      if (newValue === 'WORKSHOP') updateData.clientId = null
      break
    default:
      updateData[field] = newValue
  }

  if (field === 'endAt' && updateData.endAt) {
    if ((updateData.endAt as Date) <= intervention.startAt) {
      return { ok: false, error: "L'heure de fin doit être après l'heure de début." }
    }
  }

  await prisma.$transaction([
    prisma.intervention.update({ where: { id: interventionId }, data: updateData }),
    prisma.auditLog.create({
      data: {
        entity: 'Intervention',
        entityId: interventionId,
        field,
        oldValue,
        newValue,
        changedByUserId: userId,
        reason: reason ?? null,
      },
    }),
  ])

  revalidatePath(`/intervention/${interventionId}`)
  revalidatePath('/interventions')
  revalidatePath('/semaine')
  return { ok: true }
}
