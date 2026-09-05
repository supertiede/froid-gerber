const QUARTER_MS = 15 * 60 * 1000

export function roundToQuarter(date: Date): Date {
  return new Date(Math.round(date.getTime() / QUARTER_MS) * QUARTER_MS)
}
