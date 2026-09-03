import { prisma } from '@/lib/prisma'
import { addWeeks, startOfISOWeek, endOfISOWeek, eachDayOfInterval, format } from 'date-fns'
import { toZonedTime, format as formatTZ } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { workedMinutes } from '@/lib/calculations/workedMinutes'
import { interventionMinutes } from '@/lib/calculations/interventionMinutes'
import { formatTime } from '@/lib/time/formatTime'
import { diffMinutes } from '@/lib/time/diffMinutes'
import type { TechnicianData } from '@/types/TechnicianData'
import type { DayData } from '@/types/DayData'
import type { InterventionData } from '@/types/InterventionData'

const TZ = 'Europe/Paris'

export async function aggregateWeek(isoWeek: string): Promise<TechnicianData[]> {
  const [yearStr, weekStr] = isoWeek.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  const jan4 = new Date(year, 0, 4)
  const refDate = addWeeks(startOfISOWeek(jan4), week - 1)
  const weekStart = startOfISOWeek(refDate)
  const weekEnd = endOfISOWeek(refDate)

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })

  const results: TechnicianData[] = []

  for (const user of users) {
    const [shifts, interventions] = await Promise.all([
      prisma.shift.findMany({
        where: { userId: user.id, startAt: { gte: weekStart, lte: weekEnd } },
        include: { breaks: true },
        orderBy: { startAt: 'asc' },
      }),
      prisma.intervention.findMany({
        where: { userId: user.id, startAt: { gte: weekStart, lte: weekEnd } },
        include: { client: true },
        orderBy: { startAt: 'asc' },
      }),
    ])

    if (shifts.length === 0 && interventions.length === 0) continue

    let weekTotalMinutes = 0
    const hoursByClient = new Map<string, number>()
    const daysData: DayData[] = []

    for (const day of eachDayOfInterval({ start: weekStart, end: weekEnd })) {
      const dayStr = format(day, 'yyyy-MM-dd')

      const shift = shifts.find(s => format(toZonedTime(s.startAt, TZ), 'yyyy-MM-dd') === dayStr) ?? null
      const dayInterventions = interventions.filter(i => format(toZonedTime(i.startAt, TZ), 'yyyy-MM-dd') === dayStr)

      if (!shift && dayInterventions.length === 0) continue

      const dayAnomalies: string[] = []

      const arrival = shift ? formatTime(shift.startAt) : null
      const departure = shift?.endAt ? formatTime(shift.endAt) : null

      if (shift && !shift.endAt) dayAnomalies.push('Shift not closed')

      const lunchBreak = shift?.breaks.find(b => b.type === 'LUNCH' && b.endAt) ?? null
      const otherBreaksList = shift?.breaks.filter(b => b.type === 'SHORT' && b.endAt) ?? []

      const lunchBreakLabel = lunchBreak?.endAt
        ? `${formatTime(lunchBreak.startAt)} → ${formatTime(lunchBreak.endAt)} (${diffMinutes(lunchBreak.startAt, lunchBreak.endAt)} min)`
        : null

      const otherBreaks = otherBreaksList.map(b =>
        b.endAt ? `${formatTime(b.startAt)} → ${formatTime(b.endAt)} (${diffMinutes(b.startAt, b.endAt)} min)` : ''
      ).filter(Boolean)

      const breaksForCalc = (shift?.breaks ?? []).map(b => ({ startAt: b.startAt, endAt: b.endAt }))
      const shiftForCalc = shift ? { startAt: shift.startAt, endAt: shift.endAt } : null
      const worked = shiftForCalc?.endAt
        ? workedMinutes(shiftForCalc as { startAt: Date; endAt: Date }, breaksForCalc as { startAt: Date; endAt: Date | null }[])
        : 0

      if (shiftForCalc?.endAt) weekTotalMinutes += worked

      const intervData: InterventionData[] = []
      let totalIntervDay = 0

      for (const interv of dayInterventions) {
        const clientName = interv.type === 'WORKSHOP' ? 'Workshop' : interv.client?.name ?? '—'
        const duration = interv.endAt ? diffMinutes(interv.startAt, interv.endAt) : null
        const total = interv.endAt
          ? interventionMinutes({ startAt: interv.startAt, endAt: interv.endAt, travelMinutes: interv.travelMinutes })
          : null

        if (!interv.endAt) dayAnomalies.push(`Intervention ${clientName} not closed`)
        if (!interv.workReport && interv.endAt) dayAnomalies.push(`Work report missing: ${clientName}`)

        if (total !== null) {
          totalIntervDay += total
          hoursByClient.set(clientName, (hoursByClient.get(clientName) ?? 0) + total)
        }

        intervData.push({
          startTime: formatTime(interv.startAt),
          endTime: interv.endAt ? formatTime(interv.endAt) : null,
          clientName,
          durationMinutes: duration,
          travelMinutes: interv.travelMinutes,
          totalMinutes: total,
          workReport: interv.workReport,
        })
      }

      if (worked > 0 && Math.abs(worked - totalIntervDay) > 30) {
        dayAnomalies.push(`Gap of ${Math.abs(worked - totalIntervDay)} min between presence and interventions`)
      }

      const dayZoned = toZonedTime(day, TZ)
      daysData.push({
        dayLabel: formatTZ(dayZoned, 'EEEE d/MM', { timeZone: TZ, locale: fr }),
        arrival,
        departure,
        lunchBreakLabel,
        otherBreaks,
        workedMinutes: worked,
        interventions: intervData,
        anomalies: dayAnomalies,
      })
    }

    results.push({
      userId: user.id,
      name: user.name,
      weekTotalMinutes,
      daysData,
      hoursByClient: [...hoursByClient.entries()]
        .map(([clientName, totalMinutes]) => ({ clientName, totalMinutes }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes),
      anomalies: [],
    })
  }

  return results
}
