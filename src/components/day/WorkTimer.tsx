'use client'

import { useState, useEffect } from 'react'
import { formatDuration } from '@/lib/time/formatDuration'

type Break = {
  startAt: string
  endAt: string | null
}

type Props = {
  shiftStartAt: string | null
  breaks: Break[]
}

export function WorkTimer({ shiftStartAt, breaks }: Props) {
  const [minutes, setMinutes] = useState(() => computeNetMinutes(shiftStartAt, breaks))

  useEffect(() => {
    if (!shiftStartAt) return
    const interval = setInterval(() => {
      setMinutes(computeNetMinutes(shiftStartAt, breaks))
    }, 30000)
    return () => clearInterval(interval)
  }, [shiftStartAt, breaks])

  return (
    <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)' }}>
      {shiftStartAt ? `Temps travaillé : ${formatDuration(minutes)}` : 'Temps travaillé : –:––'}
    </span>
  )
}

function computeNetMinutes(shiftStartAt: string | null, breaks: Break[]): number {
  if (!shiftStartAt) return 0
  const now = Date.now()
  const totalMs = now - new Date(shiftStartAt).getTime()
  const breakMs = breaks.reduce((acc, b) => {
    const start = new Date(b.startAt).getTime()
    const end = b.endAt ? new Date(b.endAt).getTime() : now
    return acc + Math.max(0, end - start)
  }, 0)
  return Math.max(0, Math.floor((totalMs - breakMs) / 60000))
}
