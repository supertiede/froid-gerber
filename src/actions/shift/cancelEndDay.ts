'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function cancelEndDay(shiftId: string) {
  const session = await getSession()
  const userId = session.user.id

  const shift = await prisma.shift.findFirst({ where: { id: shiftId, userId } })
  if (!shift) return { ok: false as const, error: 'Shift not found.' }

  await prisma.shift.update({
    where: { id: shiftId },
    data: { endAt: null, endOrigin: null },
  })

  revalidatePath('/')
  return { ok: true as const }
}
