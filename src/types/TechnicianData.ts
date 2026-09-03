import type { DayData } from './DayData'

export type TechnicianData = {
  userId: string
  name: string
  weekTotalMinutes: number
  daysData: DayData[]
  hoursByClient: { clientName: string; totalMinutes: number }[]
  anomalies: string[]
}
