'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { maintenant } from '@/lib/temps'
import { revalidatePath } from 'next/cache'
import { arriver } from './pointage'
import { v4 as uuidv4 } from 'uuid'

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Non authentifié')
  return session
}

// Start an intervention (also clocks in implicitly if not yet done — A2)
export async function demarrerIntervention(data: {
  type: 'CLIENT' | 'ATELIER'
  clientId?: string
  trajetMinutes: number
  cleClient: string
}) {
  const session = await getSession()
  const userId = session.user.id

  // Idempotence
  const existing = await prisma.intervention.findUnique({ where: { cleClient: data.cleClient } })
  if (existing) return { ok: true as const, data: existing }

  // Check no open intervention
  const ouverteExistante = await prisma.intervention.findFirst({ where: { userId, finAt: null } })
  if (ouverteExistante) return { ok: false as const, error: 'Une intervention est déjà en cours.' }

  // A2: implicit clock-in if not yet done
  const poste = await prisma.poste.findFirst({
    where: { userId, finAt: null },
  })
  if (!poste) {
    await arriver(uuidv4())
  }

  const intervention = await prisma.intervention.create({
    data: {
      userId,
      type: data.type,
      clientId: data.type === 'CLIENT' ? data.clientId : null,
      trajetMinutes: data.trajetMinutes,
      debutAt: maintenant(),
      origine: 'APP',
      cleClient: data.cleClient,
    },
  })

  revalidatePath('/')
  revalidatePath('/interventions')
  return { ok: true as const, data: intervention }
}

// Stop intervention (timestamp taken immediately, compte rendu later)
export async function terminerIntervention(interventionId: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) {
    return { ok: false as const, error: 'Intervention introuvable.' }
  }
  if (intervention.finAt) return { ok: true as const } // already done

  await prisma.intervention.update({
    where: { id: interventionId },
    data: { finAt: maintenant() },
  })

  revalidatePath('/')
  revalidatePath('/interventions')
  revalidatePath(`/intervention/${interventionId}`)
  return { ok: true as const }
}

// Save compte rendu (chips + free text)
export async function enregistrerCompteRendu(interventionId: string, compteRendu: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) {
    return { ok: false as const, error: 'Intervention introuvable.' }
  }

  await prisma.intervention.update({
    where: { id: interventionId },
    data: { compteRendu },
  })

  revalidatePath(`/intervention/${interventionId}`)
  revalidatePath('/interventions')
  return { ok: true as const }
}

// Fetch today's + recent interventions for list view
export async function getInterventions(userId: string) {
  return prisma.intervention.findMany({
    where: { userId },
    include: { client: true },
    orderBy: { debutAt: 'desc' },
    take: 100, // last 100, grouped by day in UI
  })
}

type ChampIntervention = 'debutAt' | 'finAt' | 'trajetMinutes' | 'clientId' | 'compteRendu' | 'type'

export async function modifierIntervention(
  interventionId: string,
  champ: ChampIntervention,
  nouvelleValeur: string,
  motif?: string
) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) {
    return { ok: false, error: 'Intervention introuvable.' }
  }

  // Parse value based on field
  let updateData: Record<string, unknown> = {}
  const ancienneValeur = String(intervention[champ as keyof typeof intervention] ?? '')

  switch (champ) {
    case 'debutAt':
    case 'finAt':
      updateData[champ] = new Date(nouvelleValeur)
      break
    case 'trajetMinutes':
      updateData[champ] = parseInt(nouvelleValeur, 10)
      break
    case 'clientId':
      updateData.clientId = nouvelleValeur || null
      updateData.type = nouvelleValeur ? 'CLIENT' : 'ATELIER'
      break
    case 'type':
      updateData.type = nouvelleValeur
      if (nouvelleValeur === 'ATELIER') updateData.clientId = null
      break
    default:
      updateData[champ] = nouvelleValeur
  }

  // Validate: finAt must be after debutAt
  if (champ === 'finAt' && updateData.finAt) {
    const debutRef = intervention.debutAt
    if ((updateData.finAt as Date) <= debutRef) {
      return { ok: false, error: "L'heure de fin doit être après l'heure de début." }
    }
  }

  await prisma.$transaction([
    prisma.intervention.update({
      where: { id: interventionId },
      data: updateData,
    }),
    prisma.modification.create({
      data: {
        entite: 'Intervention',
        entiteId: interventionId,
        champ,
        ancienne: ancienneValeur,
        nouvelle: nouvelleValeur,
        parUserId: userId,
        motif: motif ?? null,
      },
    }),
  ])

  revalidatePath(`/intervention/${interventionId}`)
  revalidatePath('/interventions')
  revalidatePath('/semaine')
  return { ok: true }
}

export async function supprimerIntervention(interventionId: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) {
    return { ok: false, error: 'Intervention introuvable.' }
  }

  await prisma.intervention.delete({ where: { id: interventionId } })

  revalidatePath('/interventions')
  revalidatePath('/semaine')
  return { ok: true }
}
