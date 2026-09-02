'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

function normaliser(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function chercherClients(query: string) {
  const norm = normaliser(query)
  return prisma.client.findMany({
    where: {
      actif: true,
      nomNormalise: { contains: norm },
    },
    orderBy: { nom: 'asc' },
    take: 10,
  })
}

export async function creerClient(nom: string) {
  const session = await getSession()
  const creeParId = session.user.id

  const nomNormalise = normaliser(nom)

  // Check for existing
  const existing = await prisma.client.findUnique({ where: { nomNormalise } })
  if (existing) return { ok: true as const, data: existing }

  const client = await prisma.client.create({
    data: { nom: nom.trim(), nomNormalise, creeParId },
  })
  return { ok: true as const, data: client }
}
