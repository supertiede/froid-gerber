export const INTERVENTIONS_PAGE_SIZE = 20

export type InterventionRow = {
  id: string
  type: 'CLIENT' | 'WORKSHOP'
  startAt: string
  endAt: string | null
  travelMinutes: number
  workReport: string | null
  client: { id: string; name: string } | null
}
