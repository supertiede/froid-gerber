# DayScreen Status Hero — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesigner la page principale avec une architecture Status Hero — palette alignée sur le logo, 4 zones à hauteur fixe (zéro layout shift), icônes sur tous les boutons, nouveau composant WorkTimer pour le temps de travail net.

**Architecture:** La page est découpée en 4 zones à hauteur fixe : Header 56px, Status Card 240px, Action Zone 216px, Feedback Zone 56px. Les slots de boutons inutilisés utilisent `visibility: hidden` (jamais `display: none`) pour conserver leur espace. Un nouveau composant `WorkTimer` calcule le temps de travail net. Un nouveau composant `FeedbackZone` remplace à la fois le bloc erreur inline et la `CancellationBanner` popup.

**Tech Stack:** Next.js App Router, React, TypeScript, Lucide React (déjà installé), CSS custom properties

---

## Carte des fichiers

| Fichier | Action |
|---------|--------|
| `src/app/globals.css` | Modifier — nouvelle palette logo-alignée |
| `src/components/day/WorkTimer.tsx` | **Créer** — calcul temps de travail net (shift − toutes les pauses) |
| `src/components/day/FeedbackZone.tsx` | **Créer** — zone fixe 56px, erreur ou annulation avec barre de progression |
| `src/components/day/StatusBanner.tsx` | **Modifier** — hauteur fixe 240px, icônes Lucide, WorkTimer intégré |
| `src/components/day/CancellationBanner.tsx` | **Supprimer** — remplacé par FeedbackZone |
| `src/components/day/DayScreen.tsx` | **Modifier** — 4 zones fixes, icônes sur tous les boutons, slots visibility:hidden |

---

### Task 1 : Mettre à jour la palette CSS

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1 : Remplacer le bloc `:root`**

Remplacer le bloc `:root` entier dans `src/app/globals.css` :

```css
:root {
  /* Marque — alignées sur le logo */
  --bleu-ciel:    #00AADF;
  --marine:       #1E2173;

  /* Surfaces */
  --fond:         #EFF6FA;
  --surface:      #FFFFFF;
  --trait:        #D3DDE3;

  /* Texte */
  --encre:        #1E2173;
  --encre-douce:  #4A6270;

  /* Sémantique état */
  --vert:         #059669;
  --ambre:        #D97706;
  --violet:       #7C3AED;
  --gris-etat:    #64748B;
  --rouge:        #DC2626;
}
```

- [ ] **Step 2 : Ajouter la règle prefers-reduced-motion**

Ajouter à la fin de `src/app/globals.css` :

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3 : Vérifier les anciennes références**

```bash
grep -rn "var(--acier)\|var(--cuivre)" src/
```

Si des résultats apparaissent, remplacer :
- `var(--acier)` → `var(--bleu-ciel)` (usage marque) ou `var(--marine)` (usage texte)
- `var(--cuivre)` → `var(--violet)`

- [ ] **Step 5 : Build TypeScript**

```bash
npm run build 2>&1 | tail -20
```

Expected : build réussi, aucune erreur TypeScript.

- [ ] **Step 6 : Commit**

```bash
git add src/app/globals.css
git commit -m "style: mise à jour palette CSS — bleu-ciel, marine, violet alignés sur logo"
```

---

### Task 2 : Créer WorkTimer

**Files:**
- Create: `src/components/day/WorkTimer.tsx`

- [ ] **Step 1 : Créer le composant**

Créer `src/components/day/WorkTimer.tsx` :

```tsx
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
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep WorkTimer
```

Expected : aucune sortie (aucune erreur).

- [ ] **Step 3 : Commit**

```bash
git add src/components/day/WorkTimer.tsx
git commit -m "feat: WorkTimer — temps de travail net déduction des pauses en temps réel"
```

---

### Task 3 : Créer FeedbackZone (remplace CancellationBanner)

**Files:**
- Create: `src/components/day/FeedbackZone.tsx`
- Delete: `src/components/day/CancellationBanner.tsx`

- [ ] **Step 1 : Créer FeedbackZone**

Créer `src/components/day/FeedbackZone.tsx` :

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'

type Cancellation = {
  message: string
  onCancel: () => void | Promise<void>
}

type Props = {
  error: string | null
  cancellation: Cancellation | null
  onCancellationExpire: () => void
}

export function FeedbackZone({ error, cancellation, onCancellationExpire }: Props) {
  const [progress, setProgress] = useState(100)
  const expireRef = useRef(onCancellationExpire)
  expireRef.current = onCancellationExpire

  useEffect(() => {
    if (!cancellation) {
      setProgress(100)
      return
    }
    setProgress(100)
    const start = Date.now()
    const duration = 60_000
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 1 - elapsed / duration)
      setProgress(remaining * 100)
      if (remaining === 0) {
        clearInterval(interval)
        expireRef.current()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [cancellation])

  const hasContent = !!(cancellation || error)

  return (
    <div
      role={hasContent ? 'alert' : undefined}
      style={{
        height: 56,
        margin: '8px 16px 0',
        borderRadius: 8,
        overflow: 'hidden',
        visibility: hasContent ? 'visible' : 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {cancellation ? (
        <>
          <div style={{
            height: '100%',
            background: 'var(--encre)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
          }}>
            <span style={{ fontSize: 14, color: '#fff' }}>{cancellation.message}</span>
            <button
              onClick={() => { void cancellation.onCancel() }}
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                minHeight: 'auto',
              }}
            >
              Annuler
            </button>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              background: 'var(--bleu-ciel)',
              width: `${progress}%`,
              transition: 'width 1s linear',
            }}
          />
        </>
      ) : error ? (
        <div style={{
          height: '100%',
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid var(--rouge)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 16px',
        }}>
          <AlertCircle size={16} color="var(--rouge)" />
          <span style={{ fontSize: 14, color: 'var(--rouge)' }}>{error}</span>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2 : Supprimer l'ancienne CancellationBanner**

```bash
git rm src/components/day/CancellationBanner.tsx
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "FeedbackZone|CancellationBanner"
```

Expected : aucune erreur. Si `CancellationBanner` est encore importé quelque part, l'erreur apparaît ici — corriger l'import dans le fichier concerné.

- [ ] **Step 4 : Commit**

```bash
git add src/components/day/FeedbackZone.tsx
git commit -m "feat: FeedbackZone — zone fixe 56px, barre de progression, erreur + annulation unifiés"
```

---

### Task 4 : Refactoriser StatusBanner

**Files:**
- Modify: `src/components/day/StatusBanner.tsx`

- [ ] **Step 1 : Remplacer StatusBanner**

Remplacer tout le contenu de `src/components/day/StatusBanner.tsx` :

```tsx
'use client'

import { MapPin, Briefcase, Coffee, Pause, Wrench, CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Timer } from './Timer'
import { WorkTimer } from './WorkTimer'
import type { EtatJournee } from '@/lib/etat-journee'

type Break = {
  startAt: string
  endAt: string | null
}

type StateConfig = {
  bg: string
  label: string
  Icon: LucideIcon
}

const CONFIG: Record<EtatJournee, StateConfig> = {
  HORS_POSTE:       { bg: 'var(--gris-etat)', label: 'Pas encore arrivé', Icon: MapPin },
  AU_TRAVAIL:       { bg: 'var(--vert)',       label: 'Au travail',        Icon: Briefcase },
  PAUSE_DEJEUNER:   { bg: 'var(--ambre)',      label: 'Pause déjeuner',    Icon: Coffee },
  EN_PAUSE:         { bg: 'var(--ambre)',      label: 'En pause',          Icon: Pause },
  EN_INTERVENTION:  { bg: 'var(--violet)',     label: 'En intervention',   Icon: Wrench },
  JOURNEE_TERMINEE: { bg: 'var(--gris-etat)', label: 'Journée terminée',  Icon: CheckCircle },
}

type Props = {
  status: EtatJournee
  clientName?: string
  chronoStartAt: number | null
  shiftStartAt: string | null
  breaks: Break[]
  arrivalLabel?: string
}

export function StatusBanner({ status, clientName, chronoStartAt, shiftStartAt, breaks, arrivalLabel }: Props) {
  const { bg, label, Icon } = CONFIG[status]
  const displayLabel = status === 'EN_INTERVENTION' && clientName ? clientName : label

  return (
    <div
      role="status"
      aria-label={`Statut : ${displayLabel}`}
      style={{
        background: bg,
        height: 240,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={28} color="#fff" />
        <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{displayLabel}</span>
      </div>

      {chronoStartAt ? (
        <Timer startAt={chronoStartAt} />
      ) : (
        <span style={{
          fontSize: 56,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          –:––
        </span>
      )}

      <WorkTimer shiftStartAt={shiftStartAt} breaks={breaks} />

      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', minHeight: 18 }}>
        {arrivalLabel ?? ' '}
      </span>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep StatusBanner
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/components/day/StatusBanner.tsx
git commit -m "feat: StatusBanner — 240px fixe, icônes Lucide, WorkTimer, placeholder –:–– si pas de timer"
```

---

### Task 5 : Refactoriser DayScreen

**Files:**
- Modify: `src/components/day/DayScreen.tsx`

C'est le refactor principal. DayScreen reçoit 4 zones fixes et des boutons avec icônes. Les slots inutilisés sont `visibility: hidden`.

**Calcul de la hauteur de l'Action Zone :**
`paddingTop(16) + primary(72) + gap(12) + secondaryRow(52) + gap(12) + tertiary(52) = 216px` ✓

- [ ] **Step 1 : Remplacer DayScreen**

Remplacer tout le contenu de `src/components/day/DayScreen.tsx` :

```tsx
'use client'

import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import Image from 'next/image'
import {
  LogIn, Wrench, Clock, Coffee, Pause, Play,
  LogOut, CheckSquare, CalendarRange,
} from 'lucide-react'
import { StatusBanner } from './StatusBanner'
import { FeedbackZone } from './FeedbackZone'
import { clockIn } from '@/actions/shift/clockIn'
import { cancelClockIn } from '@/actions/shift/cancelClockIn'
import { startBreak } from '@/actions/shift/startBreak'
import { cancelBreak } from '@/actions/shift/cancelBreak'
import { resumeWork } from '@/actions/shift/resumeWork'
import { endDay } from '@/actions/shift/endDay'
import { cancelEndDay } from '@/actions/shift/cancelEndDay'
import { resumeDay } from '@/actions/shift/resumeDay'
import { endIntervention } from '@/actions/intervention/endIntervention'
import { enqueueAction, removeAction } from '@/lib/outbox'
import type { EtatJournee } from '@/lib/etat-journee'
import { formatTime } from '@/lib/time/formatTime'
import { formatDuration } from '@/lib/time/formatDuration'
import { breaksDuration } from '@/lib/calculations/breaksDuration'

type BreakClient = {
  id: string
  shiftId: string
  type: string
  startAt: string
  endAt: string | null
  startOrigin: string
  endOrigin: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
}

type ShiftClient = {
  id: string
  userId: string
  startAt: string
  endAt: string | null
  startOrigin: string
  endOrigin: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
  breaks: BreakClient[]
}

type ClientInfo = { id: string; name: string } | null

type InterventionClient = {
  id: string
  userId: string
  type: string
  clientId: string | null
  startAt: string
  endAt: string | null
  travelMinutes: number
  workReport: string | null
  origin: string
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
  client: ClientInfo
}

type Cancellation = {
  message: string
  onCancel: () => Promise<void>
}

type Props = {
  status: EtatJournee
  shift: ShiftClient | null
  openIntervention: InterventionClient | null
  openBreak: BreakClient | null
  chronoStartAt: number | null
  userName: string
}

type SlotConfig = {
  primary: { label: string; icon: ReactNode; color: string; onClick: () => void }
  sec1:    { label: string; icon: ReactNode; color: string; onClick: () => void; visible: boolean }
  sec2:    { label: string; icon: ReactNode; color: string; onClick: () => void; visible: boolean }
  tertiary:{ label: string; icon: ReactNode; onClick: () => void; visible: boolean }
}

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(15)
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

export function DayScreen({ status: initialStatus, shift, openIntervention, openBreak, chronoStartAt, userName }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<EtatJournee>(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellation, setCancellation] = useState<Cancellation | null>(null)

  const refresh = useCallback(() => router.refresh(), [router])
  const openBreakRef = { current: openBreak }

  async function executeWithOutbox<T>(
    idempotencyKey: string,
    type: string,
    payload: Record<string, unknown>,
    onlineAction: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
    optimisticStatus: EtatJournee,
    cancellationMessage: string,
    undoAction: () => Promise<void>,
  ) {
    if (loading) return
    vibrate()
    setLoading(true)
    setError(null)
    setStatus(optimisticStatus)
    if (!navigator.onLine) {
      await enqueueAction({ id: idempotencyKey, type, payload, createdAt: Date.now() })
      setCancellation({
        message: `${cancellationMessage} (hors ligne)`,
        onCancel: async () => {
          setCancellation(null)
          await removeAction(idempotencyKey)
          setStatus(initialStatus)
        },
      })
      setLoading(false)
      return
    }
    const result = await onlineAction()
    if (!result.ok) {
      setError((result as { ok: false; error: string }).error)
      setStatus(initialStatus)
    } else {
      setCancellation({ message: cancellationMessage, onCancel: undoAction })
    }
    setLoading(false)
    refresh()
  }

  function arrivalLabel(): string {
    if (!shift) return ''
    const parts = [`Arrivé ${formatTime(new Date(shift.startAt))}`]
    const closedBreaks = shift.breaks.filter(b => b.endAt)
    if (closedBreaks.length > 0) {
      const minutes = breaksDuration(
        closedBreaks.map(b => ({ startAt: new Date(b.startAt), endAt: b.endAt ? new Date(b.endAt) : null }))
      )
      if (minutes > 0) parts.push(`Pause ${formatDuration(minutes)}`)
    }
    return parts.join(' · ')
  }

  const handleClockIn = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key, 'clockIn', { idempotencyKey: key }, () => clockIn(key),
      'AU_TRAVAIL',
      `Arrivée enregistrée à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      async () => { if (shift?.id) await cancelClockIn(shift.id) },
    )
  }

  const handleLunchBreak = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key, 'startBreak', { type: 'LUNCH', idempotencyKey: key }, () => startBreak('LUNCH', key),
      'PAUSE_DEJEUNER', 'Pause déjeuner démarrée',
      async () => { if (openBreakRef.current?.id) await cancelBreak(openBreakRef.current.id) },
    )
  }

  const handleShortBreak = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key, 'startBreak', { type: 'SHORT', idempotencyKey: key }, () => startBreak('SHORT', key),
      'EN_PAUSE', 'Pause démarrée',
      async () => { if (openBreakRef.current?.id) await cancelBreak(openBreakRef.current.id) },
    )
  }

  const handleResumeWork = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key, 'resumeWork', { idempotencyKey: key }, () => resumeWork(),
      'AU_TRAVAIL', 'Reprise du travail enregistrée',
      async () => { refresh() },
    )
  }

  const handleEndDay = async () => {
    const key = uuidv4()
    const shiftId = shift?.id
    await executeWithOutbox(
      key, 'endDay', { idempotencyKey: key }, () => endDay(),
      'JOURNEE_TERMINEE',
      `Journée terminée à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      async () => { if (shiftId) await cancelEndDay(shiftId) },
    )
  }

  const handleResumeDay = async () => {
    const key = uuidv4()
    await executeWithOutbox(
      key, 'resumeDay', { idempotencyKey: key }, () => resumeDay(key),
      'AU_TRAVAIL', 'Journée reprise',
      async () => { refresh() },
    )
  }

  const handleEndIntervention = async () => {
    if (!openIntervention) return
    vibrate()
    setLoading(true)
    const result = await endIntervention(openIntervention.id)
    setLoading(false)
    if (result.ok) {
      router.push(`/intervention/${openIntervention.id}/fin`)
    } else {
      setError((result as { ok: false; error: string }).error)
    }
  }

  /* ---- Styles des boutons ---- */

  const primaryStyle = (color: string): React.CSSProperties => ({
    width: 'calc(100% - 32px)',
    height: 72,
    margin: '0 16px',
    borderRadius: 14,
    background: color,
    color: '#fff',
    fontSize: 17,
    fontWeight: 600,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    touchAction: 'manipulation',
    flexShrink: 0,
  })

  const secondaryStyle = (color: string, visible: boolean): React.CSSProperties => ({
    flex: 1,
    height: 52,
    borderRadius: 12,
    background: 'transparent',
    color,
    fontSize: 13,
    fontWeight: 600,
    border: `1.5px solid ${color}`,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    touchAction: 'manipulation',
    visibility: visible ? 'visible' : 'hidden',
    pointerEvents: visible ? 'auto' : 'none',
    flexShrink: 0,
  })

  const tertiaryStyle = (visible: boolean): React.CSSProperties => ({
    width: '100%',
    height: 52,
    borderRadius: 12,
    background: 'transparent',
    color: 'var(--encre-douce)',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    touchAction: 'manipulation',
    visibility: visible ? 'visible' : 'hidden',
    pointerEvents: visible ? 'auto' : 'none',
    flexShrink: 0,
  })

  /* ---- Contenu des slots par état ---- */

  const EMPTY_SEC = { label: '', icon: null, color: 'transparent', onClick: () => {}, visible: false as const }
  const EMPTY_TER = { label: '', icon: null, onClick: () => {}, visible: false as const }

  const slots: SlotConfig = (() => {
    switch (status) {
      case 'HORS_POSTE':
        return {
          primary:  { label: 'Arrivée',                   icon: <LogIn size={22} />,       color: 'var(--vert)',        onClick: handleClockIn },
          sec1:     { label: 'Intervention directe',       icon: <Wrench size={18} />,      color: 'var(--violet)',     onClick: () => router.push('/intervention/nouvelle'), visible: true },
          sec2:     { label: "J'ai oublié de pointer",     icon: <Clock size={18} />,       color: 'var(--encre-douce)',onClick: () => router.push('/oubli'),                  visible: true },
          tertiary: EMPTY_TER,
        }
      case 'AU_TRAVAIL':
        return {
          primary:  { label: 'Démarrer une intervention', icon: <Wrench size={22} />,      color: 'var(--violet)',     onClick: () => router.push('/intervention/nouvelle') },
          sec1:     { label: 'Pause déjeuner',             icon: <Coffee size={18} />,      color: 'var(--ambre)',      onClick: handleLunchBreak, visible: true },
          sec2:     { label: 'Faire une pause',            icon: <Pause size={18} />,       color: 'var(--ambre)',      onClick: handleShortBreak, visible: true },
          tertiary: { label: 'Fin de journée',             icon: <LogOut size={18} />,                                 onClick: handleEndDay,     visible: true },
        }
      case 'EN_PAUSE':
      case 'PAUSE_DEJEUNER':
        return {
          primary:  { label: 'Reprendre le travail',       icon: <Play size={22} />,        color: 'var(--vert)',       onClick: handleResumeWork },
          sec1:     EMPTY_SEC,
          sec2:     EMPTY_SEC,
          tertiary: EMPTY_TER,
        }
      case 'EN_INTERVENTION':
        return {
          primary:  { label: "Terminer l'intervention",    icon: <CheckSquare size={22} />, color: 'var(--violet)',     onClick: handleEndIntervention },
          sec1:     { label: 'Faire une pause',            icon: <Pause size={18} />,       color: 'var(--ambre)',      onClick: handleShortBreak, visible: true },
          sec2:     EMPTY_SEC,
          tertiary: EMPTY_TER,
        }
      case 'JOURNEE_TERMINEE':
        return {
          primary:  { label: 'Reprendre le travail',       icon: <Play size={22} />,        color: 'var(--vert)',       onClick: handleResumeDay },
          sec1:     { label: 'Voir ma journée',            icon: <CalendarRange size={18} />,color: 'var(--bleu-ciel)', onClick: () => router.push('/semaine'), visible: true },
          sec2:     EMPTY_SEC,
          tertiary: EMPTY_TER,
        }
    }
  })()

  const firstName = userName.split(' ')[0]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--fond)', display: 'flex', flexDirection: 'column' }}>

      {/* HEADER ZONE — 56px fixe */}
      <header style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--trait)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Image src="/froid-gerber-flocon.png" alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 13, color: 'var(--encre-douce)', fontWeight: 500 }}>
            {DATE_FMT.format(new Date())}
          </span>
        </div>
        <span style={{ fontSize: 15, color: 'var(--encre)', fontWeight: 500 }}>
          Bonjour, {firstName}
        </span>
      </header>

      {/* STATUS ZONE — 240px fixe */}
      <StatusBanner
        status={status}
        clientName={openIntervention?.client?.name ?? undefined}
        chronoStartAt={chronoStartAt}
        shiftStartAt={shift?.startAt ?? null}
        breaks={shift?.breaks ?? []}
        arrivalLabel={shift ? arrivalLabel() : undefined}
      />

      {/* ACTION ZONE — 216px fixe
          paddingTop(16) + primary(72) + gap(12) + secRow(52) + gap(12) + tertiary(52) = 216 */}
      <div style={{
        height: 216,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        paddingTop: 16,
        flexShrink: 0,
      }}>
        <button
          onClick={slots.primary.onClick}
          disabled={loading}
          aria-busy={loading}
          style={primaryStyle(slots.primary.color)}
        >
          {slots.primary.icon}
          {slots.primary.label}
        </button>

        <div style={{ display: 'flex', gap: 12, padding: '0 16px', flexShrink: 0 }}>
          <button
            onClick={slots.sec1.onClick}
            disabled={loading || !slots.sec1.visible}
            style={secondaryStyle(slots.sec1.color, slots.sec1.visible)}
          >
            {slots.sec1.icon}
            {slots.sec1.label}
          </button>
          <button
            onClick={slots.sec2.onClick}
            disabled={loading || !slots.sec2.visible}
            style={secondaryStyle(slots.sec2.color, slots.sec2.visible)}
          >
            {slots.sec2.icon}
            {slots.sec2.label}
          </button>
        </div>

        <div style={{ padding: '0 16px', flexShrink: 0 }}>
          <button
            onClick={slots.tertiary.onClick}
            disabled={loading || !slots.tertiary.visible}
            style={tertiaryStyle(slots.tertiary.visible)}
          >
            {slots.tertiary.icon}
            {slots.tertiary.label}
          </button>
        </div>
      </div>

      {/* FEEDBACK ZONE — 56px fixe (erreur ou annulation) */}
      <FeedbackZone
        error={error}
        cancellation={cancellation ? {
          message: cancellation.message,
          onCancel: async () => {
            setCancellation(null)
            await cancellation.onCancel()
          },
        } : null}
        onCancellationExpire={() => setCancellation(null)}
      />

    </div>
  )
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected : aucune erreur. Problèmes courants :
- `LucideIcon` non exporté par la version installée → remplacer le type par `React.ComponentType<{ size?: number; color?: string }>` dans StatusBanner
- `React.CSSProperties` non résolu → ajouter `import type { CSSProperties } from 'react'` et utiliser `CSSProperties`

- [ ] **Step 3 : Build complet**

```bash
npm run build 2>&1 | tail -30
```

Expected : build réussi.

- [ ] **Step 4 : Vérification visuelle**

```bash
npm run dev
```

Naviguer vers `http://localhost:3000` et vérifier :
- Header : flocon + date à gauche, "Bonjour, {prénom}" à droite
- Status card : 240px, fond coloré, icône + label, chrono ou "–:––", "Temps travaillé", label d'arrivée
- Action zone : aucun layout shift entre états, tous les boutons ont icônes et labels, slots invisibles présents
- Feedback zone : erreur rouge ou bannière d'annulation avec barre de progression bleu-ciel
- Aucun scroll horizontal sur viewport 375px

- [ ] **Step 5 : Commit**

```bash
git add src/components/day/DayScreen.tsx
git commit -m "feat: DayScreen Status Hero — 4 zones fixes, boutons icônes, zéro layout shift"
```

---

## Vérification finale

- [ ] **Build de production**

```bash
npm run build 2>&1 | tail -10
```

Expected : `✓ Compiled successfully`
