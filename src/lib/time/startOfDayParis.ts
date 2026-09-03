import { startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function startOfDayParis(date: Date): Date {
  return fromZonedTime(startOfDay(toZonedTime(date, TZ)), TZ)
}
