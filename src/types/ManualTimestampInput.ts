export type ManualTimestampInput = {
  type: 'ARRIVAL' | 'DEPARTURE' | 'BREAK'
  startTime: string
  endTime?: string
  breakType?: 'LUNCH' | 'SHORT'
  idempotencyKey: string
}
