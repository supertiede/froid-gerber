import { endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function endOfDayParis(date: Date): Date {
  return fromZonedTime(endOfDay(toZonedTime(date, TZ)), TZ)
}
