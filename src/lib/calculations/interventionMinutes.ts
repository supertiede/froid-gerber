import type { InterventionSimple } from '@/types/InterventionSimple'
import { diffMinutes } from '@/lib/time/diffMinutes'

export function interventionMinutes(intervention: InterventionSimple): number {
  if (!intervention.endAt) return 0
  return diffMinutes(intervention.startAt, intervention.endAt) + 2 * intervention.travelMinutes
}
