import { toZonedTime, format } from 'date-fns-tz'
import { fr } from 'date-fns/locale'

const TZ = 'Europe/Paris'

export function formatLongDate(date: Date): string {
  return format(toZonedTime(date, TZ), 'EEEE d MMMM', { timeZone: TZ, locale: fr })
}
