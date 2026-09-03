'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'

export async function getAllClients(): Promise<{ id: string; name: string; normalizedName: string }[]> {
  await getSession()
  return prisma.client.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, normalizedName: true },
  })
}
