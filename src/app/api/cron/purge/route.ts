import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cinqAnsAgo = new Date()
  cinqAnsAgo.setFullYear(cinqAnsAgo.getFullYear() - 5)

  try {
    const [interventions, postes, modifications, rapports] = await Promise.all([
      prisma.intervention.deleteMany({ where: { createdAt: { lt: cinqAnsAgo } } }),
      // Cascades to Pause
      prisma.poste.deleteMany({ where: { createdAt: { lt: cinqAnsAgo } } }),
      prisma.modification.deleteMany({ where: { at: { lt: cinqAnsAgo } } }),
      prisma.rapportHebdo.deleteMany({ where: { envoyeAt: { lt: cinqAnsAgo } } }),
    ])

    const total = interventions.count + postes.count + modifications.count + rapports.count
    console.log(`[purge] Supprimé : ${postes.count} postes, ${interventions.count} interventions, ${modifications.count} modifications, ${rapports.count} rapports (total : ${total})`)

    return NextResponse.json({ ok: true, supprime: { postes: postes.count, interventions: interventions.count, modifications: modifications.count, rapports: rapports.count } })
  } catch (err) {
    console.error('[purge] Erreur :', err)
    return NextResponse.json({ error: 'Erreur purge' }, { status: 500 })
  }
}
