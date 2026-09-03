import type { InterventionData } from './InterventionData'

export type DayData = {
  dayLabel: string
  arrival: string | null
  departure: string | null
  lunchBreakLabel: string | null
  otherBreaks: string[]
  workedMinutes: number
  interventions: InterventionData[]
  anomalies: string[]
}
