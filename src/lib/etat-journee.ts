export type EtatJournee =
  | 'HORS_POSTE'
  | 'AU_TRAVAIL'
  | 'PAUSE_DEJEUNER'
  | 'EN_PAUSE'
  | 'EN_INTERVENTION'
  | 'JOURNEE_TERMINEE'

type ShiftWithBreaks = {
  endAt: Date | null
  breaks: { endAt: Date | null; type: string }[]
}

type InterventionSimple = {
  endAt: Date | null
}

export function calculerEtat(
  shift: ShiftWithBreaks | null,
  openIntervention: InterventionSimple | null,
): EtatJournee {
  if (!shift) return 'HORS_POSTE'
  if (shift.endAt) return 'JOURNEE_TERMINEE'

  const openBreak = shift.breaks.find(b => !b.endAt) ?? null
  if (openBreak?.type === 'LUNCH') return 'PAUSE_DEJEUNER'
  if (openBreak?.type === 'SHORT') return 'EN_PAUSE'
  if (openIntervention && !openIntervention.endAt) return 'EN_INTERVENTION'
  return 'AU_TRAVAIL'
}
