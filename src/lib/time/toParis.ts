import { toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function toParis(date: Date): Date {
  return toZonedTime(date, TZ)
}
