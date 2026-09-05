'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Snackbar } from '@/components/ui/Snackbar'

type SnackbarState = { message: string; id: number } | null

const AUTO_DISMISS_MS = 4000
const EXIT_ANIM_MS = 220

export function useSnackbar() {
  const [state, setState] = useState<SnackbarState>(null)
  const [exiting, setExiting] = useState(false)
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const dismiss = useCallback(() => {
    clearTimeout(autoTimer.current)
    setExiting(true)
    exitTimer.current = setTimeout(() => {
      setState(null)
      setExiting(false)
    }, EXIT_ANIM_MS)
  }, [])

  const dismissRef = useRef(dismiss)
  dismissRef.current = dismiss

  const showError = useCallback((message: string) => {
    clearTimeout(autoTimer.current)
    clearTimeout(exitTimer.current)
    setExiting(false)
    setState(prev => ({ message, id: (prev?.id ?? 0) + 1 }))
    autoTimer.current = setTimeout(() => dismissRef.current(), AUTO_DISMISS_MS)
  }, [])

  useEffect(() => () => {
    clearTimeout(autoTimer.current)
    clearTimeout(exitTimer.current)
  }, [])

  const snackbarNode = state ? (
    <Snackbar
      key={state.id}
      message={state.message}
      exiting={exiting}
      onDismiss={dismiss}
    />
  ) : null

  return { showError, snackbarNode }
}
