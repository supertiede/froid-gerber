'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type FinalResultCallback = (text: string) => void

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  interimText: string
  error: string | null
  start: () => void
  stop: () => void
  setOnFinalResult: (cb: FinalResultCallback) => void
}

// Web Speech API: SpeechRecognition class and SpeechRecognitionEvent are absent from the TypeScript DOM lib
interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null
  onend: ((event: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: ISpeechRecognitionConstructor
  webkitSpeechRecognition?: ISpeechRecognitionConstructor
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const onFinalResultRef = useRef<FinalResultCallback | null>(null)

  useEffect(() => {
    const win = window as SpeechRecognitionWindow
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition

    if (!SR) return
    setIsSupported(true)

    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          onFinalResultRef.current?.(result[0].transcript)
        } else {
          interim += result[0].transcript
        }
      }
      setInterimText(interim)
    }

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      setError(event.error)
      setIsListening(false)
      setInterimText('')
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimText('')
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [])

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return
    setInterimText('')
    setError(null)
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      // start() threw synchronously (e.g. already started)
    }
  }, [isListening])

  const stop = useCallback(() => {
    if (!recognitionRef.current || !isListening) return
    recognitionRef.current.stop()
  }, [isListening])

  const setOnFinalResult = useCallback((cb: FinalResultCallback) => {
    onFinalResultRef.current = cb
  }, [])

  return { isSupported, isListening, interimText, error, start, stop, setOnFinalResult }
}
