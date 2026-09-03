'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function resumeWork() {
  const session = await getSession()
  const userId = session.user.id

  const shift = await getOpenShift(userId)
  if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }

  const openBreak = shift.breaks.find(b => !b.endAt)
  if (!openBreak) return { ok: false as const, error: 'Aucune pause en cours.' }
  if (openBreak.endAt) return { ok: true as const }

  await prisma.break.update({
    where: { id: openBreak.id },
    data: { endAt: now(), endOrigin: 'APP' },
  })

  revalidatePath('/')
  return { ok: true as const }
}
