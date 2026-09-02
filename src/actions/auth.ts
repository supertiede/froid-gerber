'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function marquerMotDePasseChange() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')

  await prisma.user.update({
    where: { id: session.user.id },
    data: { doitChangerMotDePasse: false },
  })

  revalidatePath('/')
}
