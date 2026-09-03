import type { ShiftSimple } from '@/types/ShiftSimple'
import { diffMinutes } from '@/lib/time/diffMinutes'

export function shiftDuration(shift: ShiftSimple): number {
  if (!shift.endAt) return 0
  return diffMinutes(shift.startAt, shift.endAt)
}
