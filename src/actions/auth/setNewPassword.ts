'use server'

import { getSession } from '@/lib/auth/getSession'
import { prisma } from '@/lib/prisma'
import { hashPassword } from 'better-auth/crypto'
import { revalidatePath } from 'next/cache'

export async function setNewPassword(newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < 6) {
    return { ok: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' }
  }

  const session = await getSession()
  const hashed = await hashPassword(newPassword)

  await prisma.account.updateMany({
    where: { userId: session.user.id, providerId: 'credential' },
    data: { password: hashed },
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  })

  revalidatePath('/')
  return { ok: true }
}
