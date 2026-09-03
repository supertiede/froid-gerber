import { prisma } from './prisma'
import { getISOWeek, getISOWeekYear, addWeeks, startOfISOWeek, endOfISOWeek, eachDayOfInterval, format } from 'date-fns'
import { toZonedTime, format as formatTZ } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { heuresTravailleesMinutes, tempsInterventionMinutes } from './calculs'
import { formatHeure, diffMinutes } from './temps'

const TZ = 'Europe/Paris'

export type DonneesTechnicien = {
  userId: string
  name: string
  totalSemaineMinutes: number
  joursData: JourData[]
  heuresParClient: { clientNom: string; totalMinutes: number }[]
  anomalies: string[]
}

export type JourData = {
  jourLabel: string
  arrivee: string | null
  depart: string | null
  pauseDejeLabel: string | null
  autresPauses: string[]
  heuresTravailleesMinutes: number
  interventions: IntervData[]
  anomalies: string[]
}

export type IntervData = {
  heureDebut: string
  heureFin: string | null
  clientNom: string
  dureeMinutes: number | null
  trajetMinutes: number
  totalMinutes: number | null
  compteRendu: string | null
}

export async function aggregerSemaine(semaineIso: string): Promise<DonneesTechnicien[]> {
  // Parse semaineIso: "2026-W36"
  const [yearStr, weekStr] = semaineIso.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  const jan4 = new Date(year, 0, 4)
  const refDate = addWeeks(startOfISOWeek(jan4), week - 1)
  const debutSemaine = startOfISOWeek(refDate)
  const finSemaine = endOfISOWeek(refDate)

  // Fetch all active users
  const users = await prisma.user.findMany({
    where: { actif: true },
    orderBy: { name: 'asc' },
  })

  const results: DonneesTechnicien[] = []

  for (const user of users) {
    const [postes, interventions] = await Promise.all([
      prisma.poste.findMany({
        where: { userId: user.id, debutAt: { gte: debutSemaine, lte: finSemaine } },
        include: { pauses: true },
        orderBy: { debutAt: 'asc' },
      }),
      prisma.intervention.findMany({
        where: { userId: user.id, debutAt: { gte: debutSemaine, lte: finSemaine } },
        include: { client: true },
        orderBy: { debutAt: 'asc' },
      }),
    ])

    if (postes.length === 0 && interventions.length === 0) continue

    let totalSemaineMinutes = 0
    const heuresParClient = new Map<string, number>()
    const joursData: JourData[] = []
    const anomaliesGlobales: string[] = []

    const jours = eachDayOfInterval({ start: debutSemaine, end: finSemaine })

    for (const jour of jours) {
      const jourStr = format(jour, 'yyyy-MM-dd')

      const poste = postes.find(p => {
        const d = toZonedTime(p.debutAt, TZ)
        return format(d, 'yyyy-MM-dd') === jourStr
      }) ?? null

      const intervJour = interventions.filter(i => {
        const d = toZonedTime(i.debutAt, TZ)
        return format(d, 'yyyy-MM-dd') === jourStr
      })

      if (!poste && intervJour.length === 0) continue

      const anomaliesJour: string[] = []

      // Poste data
      const arrivee = poste ? formatHeure(poste.debutAt) : null
      const depart = poste?.finAt ? formatHeure(poste.finAt) : null

      if (poste && !poste.finAt) {
        anomaliesJour.push('Poste non clôturé')
      }

      // Pauses
      const pauseDeje = poste?.pauses.find(p => p.type === 'DEJEUNER' && p.finAt) ?? null
      const autresPauses = poste?.pauses.filter(p => p.type === 'COURTE' && p.finAt) ?? []

      const pauseDejeLabel = pauseDeje && pauseDeje.finAt
        ? `${formatHeure(pauseDeje.debutAt)} → ${formatHeure(pauseDeje.finAt)} (${diffMinutes(pauseDeje.debutAt, pauseDeje.finAt)} min)`
        : null

      const autresPausesLabels = autresPauses.map(p =>
        p.finAt ? `${formatHeure(p.debutAt)} → ${formatHeure(p.finAt)} (${diffMinutes(p.debutAt, p.finAt)} min)` : ''
      ).filter(Boolean)

      // Hours worked
      const pausesConv = (poste?.pauses ?? []).map(p => ({ debutAt: p.debutAt, finAt: p.finAt }))
      const posteConv = poste ? { debutAt: poste.debutAt, finAt: poste.finAt } : null
      const heuresTravaillees = posteConv && posteConv.finAt
        ? heuresTravailleesMinutes(posteConv as { debutAt: Date; finAt: Date }, pausesConv as { debutAt: Date; finAt: Date | null }[])
        : 0

      if (posteConv?.finAt) totalSemaineMinutes += heuresTravaillees

      // Interventions
      const intervData: IntervData[] = []
      let totalIntervJour = 0

      for (const interv of intervJour) {
        const clientNom = interv.type === 'ATELIER' ? 'Atelier' : interv.client?.nom ?? '—'
        const duree = interv.finAt ? diffMinutes(interv.debutAt, interv.finAt) : null
        const total = interv.finAt
          ? tempsInterventionMinutes({ debutAt: interv.debutAt, finAt: interv.finAt, trajetMinutes: interv.trajetMinutes })
          : null

        if (!interv.finAt) anomaliesJour.push(`Intervention ${clientNom} non clôturée`)
        if (!interv.compteRendu && interv.finAt) anomaliesJour.push(`Compte rendu manquant : ${clientNom}`)

        if (total !== null) {
          totalIntervJour += total
          heuresParClient.set(clientNom, (heuresParClient.get(clientNom) ?? 0) + total)
        }

        intervData.push({
          heureDebut: formatHeure(interv.debutAt),
          heureFin: interv.finAt ? formatHeure(interv.finAt) : null,
          clientNom,
          dureeMinutes: duree,
          trajetMinutes: interv.trajetMinutes,
          totalMinutes: total,
          compteRendu: interv.compteRendu,
        })
      }

      // Ecart detection
      if (heuresTravaillees > 0 && Math.abs(heuresTravaillees - totalIntervJour) > 30) {
        anomaliesJour.push(`Ecart de ${Math.abs(heuresTravaillees - totalIntervJour)} min entre présence et interventions`)
      }

      const jourZoned = toZonedTime(jour, TZ)
      joursData.push({
        jourLabel: formatTZ(jourZoned, 'EEEE d/MM', { timeZone: TZ, locale: fr }),
        arrivee,
        depart,
        pauseDejeLabel,
        autresPauses: autresPausesLabels,
        heuresTravailleesMinutes: heuresTravaillees,
        interventions: intervData,
        anomalies: anomaliesJour,
      })
    }

    results.push({
      userId: user.id,
      name: user.name,
      totalSemaineMinutes,
      joursData,
      heuresParClient: [...heuresParClient.entries()]
        .map(([clientNom, totalMinutes]) => ({ clientNom, totalMinutes }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes),
      anomalies: anomaliesGlobales,
    })
  }

  return results
}

export function getSemaineIsoActuelle(): string {
  const now = toZonedTime(new Date(), 'Europe/Paris')
  return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`
}
