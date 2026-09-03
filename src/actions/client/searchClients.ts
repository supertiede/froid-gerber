'use server'

import { prisma } from '@/lib/prisma'
import { normalizeClientName } from '@/lib/queries/normalizeClientName'

export async function searchClients(query: string) {
  const normalized = normalizeClientName(query)
  return prisma.client.findMany({
    where: { active: true, normalizedName: { contains: normalized } },
    orderBy: { name: 'asc' },
    take: 10,
  })
}
