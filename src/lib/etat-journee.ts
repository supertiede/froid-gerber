export type EtatJournee =
  | 'HORS_POSTE'
  | 'AU_TRAVAIL'
  | 'PAUSE_DEJEUNER'
  | 'EN_PAUSE'
  | 'EN_INTERVENTION'
  | 'JOURNEE_TERMINEE'

type PosteAvecPauses = {
  finAt: Date | null
  pauses: { finAt: Date | null; type: string }[]
}

type InterventionSimple = {
  finAt: Date | null
}

export function calculerEtat(
  poste: PosteAvecPauses | null,
  interventionEnCours: InterventionSimple | null,
): EtatJournee {
  if (!poste) return 'HORS_POSTE'
  if (poste.finAt) return 'JOURNEE_TERMINEE'

  const pauseOuverte = poste.pauses.find(p => !p.finAt) ?? null
  if (pauseOuverte?.type === 'DEJEUNER') return 'PAUSE_DEJEUNER'
  if (pauseOuverte?.type === 'COURTE') return 'EN_PAUSE'
  if (interventionEnCours && !interventionEnCours.finAt) return 'EN_INTERVENTION'
  return 'AU_TRAVAIL'
}
