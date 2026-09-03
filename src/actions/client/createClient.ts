'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { normalizeClientName } from '@/lib/queries/normalizeClientName'

export async function createClient(name: string): Promise<{ ok: boolean; data?: { id: string; name: string; normalizedName: string } }> {
  const session = await getSession()
  const createdById = session.user.id
  const normalizedName = normalizeClientName(name)

  const existing = await prisma.client.findUnique({ where: { normalizedName } })
  if (existing) return { ok: true, data: { id: existing.id, name: existing.name, normalizedName: existing.normalizedName } }

  const client = await prisma.client.create({
    data: { name: name.trim(), normalizedName, createdById },
  })
  return { ok: true, data: { id: client.id, name: client.name, normalizedName: client.normalizedName } }
}
