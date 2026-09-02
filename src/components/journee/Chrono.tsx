'use client'

import { useState, useEffect } from 'react'
import { formatDuree } from '@/lib/temps'

export function Chrono({ startAt }: { startAt: number }) {
  const [minutes, setMinutes] = useState(() =>
    Math.floor((Date.now() - startAt) / 60000)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutes(Math.floor((Date.now() - startAt) / 60000))
    }, 30000)
    return () => clearInterval(interval)
  }, [startAt])

  return (
    <span style={{
      fontSize: 44,
      fontWeight: 600,
      color: '#fff',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em',
    }}>
      {formatDuree(minutes)}
    </span>
  )
}
