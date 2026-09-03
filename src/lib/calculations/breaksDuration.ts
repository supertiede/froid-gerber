import type { BreakSimple } from '@/types/BreakSimple'
import { diffMinutes } from '@/lib/time/diffMinutes'

export function breaksDuration(breaks: BreakSimple[]): number {
  return breaks.reduce((acc, b) => {
    if (!b.endAt) return acc
    return acc + diffMinutes(b.startAt, b.endAt)
  }, 0)
}
