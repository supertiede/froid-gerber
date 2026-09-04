'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type FinalResultCallback = (text: string) => void

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  interimText: string
  start: () => void
  stop: () => void
  setOnFinalResult: (cb: FinalResultCallback) => void
}

// Web Speech API types (not yet in all TypeScript DOM libs)
interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface ISpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
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

    recognition.onerror = () => {
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
    recognitionRef.current.start()
    setIsListening(true)
  }, [isListening])

  const stop = useCallback(() => {
    if (!recognitionRef.current || !isListening) return
    recognitionRef.current.stop()
    setIsListening(false)
    setInterimText('')
  }, [isListening])

  const setOnFinalResult = useCallback((cb: FinalResultCallback) => {
    onFinalResultRef.current = cb
  }, [])

  return { isSupported, isListening, interimText, start, stop, setOnFinalResult }
}
