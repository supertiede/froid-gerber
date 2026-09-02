import { diffMinutes } from './temps'

type PosteSimple = { debutAt: Date; finAt: Date | null }
type PauseSimple = { debutAt: Date; finAt: Date | null }
type InterventionSimple = { debutAt: Date; finAt: Date | null; trajetMinutes: number }

export function dureePosteMinutes(poste: PosteSimple): number {
  if (!poste.finAt) return 0
  return diffMinutes(poste.debutAt, poste.finAt)
}

export function dureePausesMinutes(pauses: PauseSimple[]): number {
  return pauses.reduce((acc, p) => {
    if (!p.finAt) return acc
    return acc + diffMinutes(p.debutAt, p.finAt)
  }, 0)
}

export function heuresTravailleesMinutes(
  poste: PosteSimple,
  pauses: PauseSimple[]
): number {
  return dureePosteMinutes(poste) - dureePausesMinutes(pauses)
}

export function tempsInterventionMinutes(
  intervention: InterventionSimple
): number {
  if (!intervention.finAt) return 0
  return diffMinutes(intervention.debutAt, intervention.finAt) + 2 * intervention.trajetMinutes
}
