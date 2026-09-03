import { prisma } from '@/lib/prisma'

export async function findShiftByClientKey(idempotencyKey: string) {
  return prisma.shift.findUnique({ where: { idempotencyKey } })
}
