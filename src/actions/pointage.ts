'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { maintenant } from '@/lib/temps'
import { revalidatePath } from 'next/cache'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

async function getPosteOuvert(userId: string) {
  return prisma.poste.findFirst({
    where: { userId, finAt: null },
    include: { pauses: true },
  })
}

async function getInterventionOuverte(userId: string) {
  return prisma.intervention.findFirst({
    where: { userId, finAt: null },
    include: { client: true },
  })
}

async function posteExisteParCleClient(cleClient: string) {
  return prisma.poste.findUnique({ where: { cleClient } })
}

export async function arriver(cleClient: string) {
  const session = await getSession()
  const userId = session.user.id

  // Idempotence
  const existing = await posteExisteParCleClient(cleClient)
  if (existing) return { ok: true as const, data: existing }

  const posteOuvert = await getPosteOuvert(userId)
  if (posteOuvert) return { ok: false as const, error: 'Vous êtes déjà au travail.' }

  const poste = await prisma.poste.create({
    data: {
      userId,
      debutAt: maintenant(),
      origineDebut: 'APP',
      cleClient,
    },
  })

  revalidatePath('/')
  return { ok: true as const, data: poste }
}

export async function annulerArrivee(posteId: string) {
  const session = await getSession()
  const userId = session.user.id

  // Verify it belongs to this user
  const poste = await prisma.poste.findFirst({ where: { id: posteId, userId } })
  if (!poste) return { ok: false as const, error: 'Poste introuvable.' }

  await prisma.poste.delete({ where: { id: posteId } })

  revalidatePath('/')
  return { ok: true as const }
}

export async function demarrerPause(type: 'DEJEUNER' | 'COURTE', cleClient: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await prisma.pause.findUnique({ where: { cleClient } })
  if (existing) return { ok: true as const, data: existing }

  const poste = await getPosteOuvert(userId)
  if (!poste) return { ok: false as const, error: 'Aucun poste ouvert.' }
  if (poste.pauses.find(p => !p.finAt)) return { ok: false as const, error: 'Une pause est déjà en cours.' }

  const pause = await prisma.pause.create({
    data: {
      posteId: poste.id,
      type,
      debutAt: maintenant(),
      origineDebut: 'APP',
      cleClient,
    },
  })

  revalidatePath('/')
  return { ok: true as const, data: pause }
}

export async function annulerPause(pauseId: string) {
  const session = await getSession()
  const userId = session.user.id

  // Verify through poste relationship
  const pause = await prisma.pause.findFirst({
    where: { id: pauseId },
    include: { poste: true },
  })
  if (!pause || pause.poste.userId !== userId) return { ok: false as const, error: 'Pause introuvable.' }

  await prisma.pause.delete({ where: { id: pauseId } })

  revalidatePath('/')
  return { ok: true as const }
}

export async function reprendreTravail(cleClient: string) {
  const session = await getSession()
  const userId = session.user.id

  const poste = await getPosteOuvert(userId)
  if (!poste) return { ok: false as const, error: 'Aucun poste ouvert.' }

  const pause = poste.pauses.find(p => !p.finAt)
  if (!pause) return { ok: false as const, error: 'Aucune pause en cours.' }

  // Check idempotence via finAt
  if (pause.finAt) return { ok: true as const }

  await prisma.pause.update({
    where: { id: pause.id },
    data: { finAt: maintenant(), origineFin: 'APP' },
  })

  revalidatePath('/')
  return { ok: true as const }
}

export async function annulerRepriseTravail(pauseId: string) {
  const session = await getSession()
  const userId = session.user.id

  const pause = await prisma.pause.findFirst({
    where: { id: pauseId },
    include: { poste: true },
  })
  if (!pause || pause.poste.userId !== userId) return { ok: false as const, error: 'Pause introuvable.' }

  // Re-open the pause
  await prisma.pause.update({
    where: { id: pauseId },
    data: { finAt: null, origineFin: null },
  })

  revalidatePath('/')
  return { ok: true as const }
}

export async function terminerJournee(cleClient: string) {
  const session = await getSession()
  const userId = session.user.id

  const poste = await getPosteOuvert(userId)
  if (!poste) return { ok: false as const, error: 'Aucun poste ouvert.' }

  const interventionOuverte = await getInterventionOuverte(userId)
  if (interventionOuverte) {
    return { ok: false as const, error: "Terminez d'abord votre intervention en cours." }
  }

  await prisma.poste.update({
    where: { id: poste.id },
    data: { finAt: maintenant(), origineFin: 'APP' },
  })

  revalidatePath('/')
  return { ok: true as const }
}

export async function annulerFinJournee(posteId: string) {
  const session = await getSession()
  const userId = session.user.id

  const poste = await prisma.poste.findFirst({ where: { id: posteId, userId } })
  if (!poste) return { ok: false as const, error: 'Poste introuvable.' }

  await prisma.poste.update({
    where: { id: posteId },
    data: { finAt: null, origineFin: null },
  })

  revalidatePath('/')
  return { ok: true as const }
}

export async function reprendreJournee(cleClient: string) {
  const session = await getSession()
  const userId = session.user.id

  // Idempotence
  const existing = await posteExisteParCleClient(cleClient)
  if (existing) return { ok: true as const, data: existing }

  // Re-open: create a new poste
  const poste = await prisma.poste.create({
    data: {
      userId,
      debutAt: maintenant(),
      origineDebut: 'APP',
      cleClient,
    },
  })

  revalidatePath('/')
  return { ok: true as const, data: poste }
}

export async function pointageManuel(data: {
  type: 'ARRIVEE' | 'DEPART' | 'PAUSE'
  heureDebut: string // ISO string
  heureFin?: string  // ISO string, required for PAUSE
  typePause?: 'DEJEUNER' | 'COURTE'
  cleClient: string
}) {
  const session = await getSession()
  const userId = session.user.id
  const now = maintenant()

  // Validate: not future, not more than 7 days ago
  const debut = new Date(data.heureDebut)
  if (debut > now) return { ok: false as const, error: "L'heure ne peut pas être dans le futur." }
  if (now.getTime() - debut.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return { ok: false as const, error: 'Impossible de saisir une heure de plus de 7 jours.' }
  }

  if (data.type === 'ARRIVEE') {
    const existing = await posteExisteParCleClient(data.cleClient)
    if (existing) return { ok: true as const }

    await prisma.poste.create({
      data: { userId, debutAt: debut, origineDebut: 'MANUEL', cleClient: data.cleClient },
    })
  }

  if (data.type === 'DEPART') {
    const poste = await getPosteOuvert(userId)
    if (!poste) return { ok: false as const, error: 'Aucun poste ouvert.' }
    await prisma.poste.update({
      where: { id: poste.id },
      data: { finAt: debut, origineFin: 'MANUEL' },
    })
  }

  if (data.type === 'PAUSE' && data.heureFin && data.typePause) {
    const fin = new Date(data.heureFin)
    const poste = await getPosteOuvert(userId)
    if (!poste) return { ok: false as const, error: 'Aucun poste ouvert.' }

    const existing = await prisma.pause.findUnique({ where: { cleClient: data.cleClient } })
    if (existing) return { ok: true as const }

    await prisma.pause.create({
      data: {
        posteId: poste.id,
        type: data.typePause,
        debutAt: debut,
        finAt: fin,
        origineDebut: 'MANUEL',
        origineFin: 'MANUEL',
        cleClient: data.cleClient,
      },
    })
  }

  revalidatePath('/')
  return { ok: true as const }
}
