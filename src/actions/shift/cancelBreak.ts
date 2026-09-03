'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function cancelBreak(breakId: string) {
  const session = await getSession()
  const userId = session.user.id

  const breakRecord = await prisma.break.findFirst({
    where: { id: breakId },
    include: { shift: true },
  })
  if (!breakRecord || breakRecord.shift.userId !== userId) return { ok: false as const, error: 'Break not found.' }

  await prisma.break.delete({ where: { id: breakId } })

  revalidatePath('/')
  return { ok: true as const }
}
