import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

const TZ = 'Europe/Paris'

export function maintenant(): Date {
  return new Date()
}

export function enParis(date: Date): Date {
  return toZonedTime(date, TZ)
}

export function debutJourneeParis(date: Date): Date {
  return fromZonedTime(startOfDay(toZonedTime(date, TZ)), TZ)
}

export function finJourneeParis(date: Date): Date {
  return fromZonedTime(endOfDay(toZonedTime(date, TZ)), TZ)
}

export function formatHeure(date: Date): string {
  return format(toZonedTime(date, TZ), 'HH:mm', { timeZone: TZ })
}

export function formatDuree(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  return `${h} h ${m.toString().padStart(2, '0')}`
}

export function diffMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000)
}

export function formatDateLongue(date: Date): string {
  return format(toZonedTime(date, TZ), 'EEEE d MMMM', { timeZone: TZ, locale: fr })
}
