import { toZonedTime, format } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function formatTime(date: Date): string {
  return format(toZonedTime(date, TZ), 'HH:mm', { timeZone: TZ })
}
