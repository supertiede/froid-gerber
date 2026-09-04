# Voice Dictation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bouton micro dans le textarea de compte-rendu d'intervention, visible uniquement quand la Web Speech API est disponible, permettant la dictée vocale en français avec ajout à la suite du texte existant.

**Architecture:** Un hook `useSpeechRecognition` encapsule toute la logique Web Speech API et expose une interface simple (`isSupported`, `isListening`, `interimText`, `start`, `stop`, callback `onFinalResult`). `WorkReportForm` consomme ce hook et rend le bouton conditionnellement. Le textarea affiche le texte intermédiaire en temps réel en combinant `freeText` + `interimText`.

**Tech Stack:** Next.js 15 (App Router), React hooks, Web Speech API native (pas de lib externe), Lucide icons, inline styles CSS variables.

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `src/hooks/useSpeechRecognition.ts` | Créer |
| `src/components/intervention/WorkReportForm.tsx` | Modifier |
| `src/app/globals.css` | Modifier — ajouter `@keyframes mic-pulse` |

---

### Task 1 : Hook `useSpeechRecognition`

**Files:**
- Create: `src/hooks/useSpeechRecognition.ts`

- [ ] **Step 1 : Créer le hook**

```ts
// src/hooks/useSpeechRecognition.ts
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

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null)
  const onFinalResultRef = useRef<FinalResultCallback | null>(null)

  useEffect(() => {
    const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition

    if (!SR) return
    setIsSupported(true)

    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
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
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/useSpeechRecognition.ts
git commit -m "feat: add useSpeechRecognition hook"
```

---

### Task 2 : Animation CSS pulse

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1 : Ajouter le keyframe à la fin de globals.css**

Ajouter après la dernière règle existante (`@media (prefers-reduced-motion: reduce)`) :

```css
/* Mic recording pulse */
@keyframes mic-pulse {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.65 }
}
.mic-recording {
  animation: mic-pulse 1s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .mic-recording { animation: none }
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add mic-pulse animation"
```

---

### Task 3 : Intégrer le bouton micro dans WorkReportForm

**Files:**
- Modify: `src/components/intervention/WorkReportForm.tsx`

- [ ] **Step 1 : Remplacer le contenu de WorkReportForm.tsx**

```tsx
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

  const { isSupported, isListening, interimText, start, stop, setOnFinalResult } =
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

      <button
        onClick={handleSave}
        disabled={isPending}
        style={{
          height: 96,
          borderRadius: 12,
          background: 'var(--acier)',
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
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/intervention/WorkReportForm.tsx
git commit -m "feat: voice dictation mic button in WorkReportForm"
```

---

### Task 4 : Vérification manuelle sur mobile

- [ ] **Step 1 : Lancer le serveur de dev**

```bash
npm run dev
```

- [ ] **Step 2 : Ouvrir sur un vrai device iOS/Android** (ou Chrome desktop)

URL locale : `http://localhost:3000`

- [ ] **Step 3 : Créer et terminer une intervention test, aller sur la page de fin**

Vérifier :
- Sur Chrome/Safari : le bouton micro apparaît dans le coin bas-droit du textarea
- Sur Firefox : le bouton n'apparaît pas du tout
- Tap micro → browser demande la permission → accordée → border textarea passe en rouge, bouton pulse
- Parler → texte apparaît en temps réel
- Tap MicOff → enregistrement s'arrête, texte consolidé dans le champ
- Tap ENREGISTRER → navigue vers `/interventions`
