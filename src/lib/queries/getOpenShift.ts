import { prisma } from '@/lib/prisma'

export async function getOpenShift(userId: string) {
  return prisma.shift.findFirst({
    where: { userId, endAt: null },
    include: { breaks: true },
  })
}
