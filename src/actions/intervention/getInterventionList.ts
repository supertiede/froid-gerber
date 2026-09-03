'use server'

import { prisma } from '@/lib/prisma'

export async function getInterventionList(userId: string) {
  return prisma.intervention.findMany({
    where: { userId },
    include: { client: true },
    orderBy: { startAt: 'desc' },
    take: 100,
  })
}
