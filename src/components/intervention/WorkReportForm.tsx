'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff } from 'lucide-react'
import { saveWorkReport } from '@/actions/intervention/saveWorkReport'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

export function WorkReportForm({
  interventionId,
  workReport,
}: {
  interventionId: string
  workReport: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [freeText, setFreeText] = useState(workReport)

  const { isSupported, isListening, interimText, error, start, stop, setOnFinalResult } =
    useSpeechRecognition()

  useEffect(() => {
    setOnFinalResult((text: string) => {
      setFreeText(prev => (prev ? prev + ' ' + text : text))
    })
  }, [setOnFinalResult])

  function handleSave() {
    if (isListening) stop()
    startTransition(async () => {
      await saveWorkReport(interventionId, freeText.trim())
      if ('vibrate' in navigator) navigator.vibrate(15)
      router.push('/interventions')
      router.refresh()
    })
  }

  const displayValue = freeText + (isListening && interimText ? ' ' + interimText : '')

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 16 }}>
        Qu&apos;est-ce que vous avez fait ?
      </h2>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <textarea
          value={displayValue}
          onChange={e => {
            if (!isListening) setFreeText(e.target.value)
          }}
          readOnly={isListening}
          placeholder="Ajouter un détail…"
          rows={4}
          style={{
            width: '100%',
            padding: `12px ${isSupported ? '56px' : '16px'} 12px 16px`,
            border: `1px solid ${isListening ? 'var(--rouge)' : 'var(--trait)'}`,
            borderRadius: 8,
            fontSize: 18,
            color: 'var(--encre)',
            background: 'var(--surface)',
            resize: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 200ms ease',
          }}
        />

        {isSupported && (
          <button
            onClick={isListening ? stop : start}
            className={isListening ? 'mic-recording' : undefined}
            aria-label={isListening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
            aria-pressed={isListening}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              minHeight: 'unset',
              borderRadius: 8,
              border: isListening ? 'none' : '1.5px solid var(--trait)',
              background: isListening ? 'var(--rouge)' : 'transparent',
              color: isListening ? '#fff' : 'var(--encre-douce)',
              cursor: 'pointer',
              transition: 'background 200ms ease, border-color 200ms ease',
            }}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}

      </div>

      {error && (
        <p style={{ fontSize: 13, color: 'var(--rouge)', marginBottom: 12 }}>
          {error === 'not-allowed'
            ? 'Permission micro refusée'
            : error === 'network'
            ? 'Erreur réseau — réessayez'
            : 'La dictée a été interrompue'}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending}
        style={{
          height: 96,
          borderRadius: 12,
          background: 'var(--bleu-ciel)',
          color: '#fff',
          fontSize: 20,
          fontWeight: 600,
          border: 'none',
          width: '100%',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? 'Enregistrement…' : 'ENREGISTRER'}
      </button>
    </div>
  )
}
