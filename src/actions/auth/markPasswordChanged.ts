'use server'

import { getSession } from '@/lib/auth/getSession'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function markPasswordChanged() {
  const session = await getSession()
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  })
  revalidatePath('/')
}
