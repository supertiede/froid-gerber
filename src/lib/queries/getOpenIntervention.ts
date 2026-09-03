import { prisma } from '@/lib/prisma'

export async function getOpenIntervention(userId: string) {
  return prisma.intervention.findFirst({
    where: { userId, endAt: null },
    include: { client: true },
  })
}
