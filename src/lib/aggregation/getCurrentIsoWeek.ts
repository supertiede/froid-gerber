import { getISOWeek, getISOWeekYear } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function getCurrentIsoWeek(): string {
  const now = toZonedTime(new Date(), 'Europe/Paris')
  return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`
}
