import type { ShiftSimple } from '@/types/ShiftSimple'
import type { BreakSimple } from '@/types/BreakSimple'
import { shiftDuration } from './shiftDuration'
import { breaksDuration } from './breaksDuration'

export function workedMinutes(shift: ShiftSimple, breaks: BreakSimple[]): number {
  return shiftDuration(shift) - breaksDuration(breaks)
}
