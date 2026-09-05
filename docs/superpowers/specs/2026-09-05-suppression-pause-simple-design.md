# Suppression pause simple — Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Supprimer la notion de "pause simple" (SHORT) et ne conserver que la "pause déjeuner" (LUNCH), disponible aussi bien en AU_TRAVAIL qu'en EN_INTERVENTION.

**Architecture:** UI-only + simplification state machine. L'enum Prisma `SHORT` reste en DB pour compatibilité historique, mais le code applicatif ne le distingue plus : tout break ouvert → `PAUSE_DEJEUNER`. Aucune migration DB.

**Fichiers touchés:** 5 fichiers sources + 1 doc

---

## State machine (`src/lib/etat-journee.ts`)

Supprimer `EN_PAUSE` du type `EtatJournee` :

```ts
export type EtatJournee =
  | 'HORS_POSTE'
  | 'AU_TRAVAIL'
  | 'PAUSE_DEJEUNER'
  | 'EN_INTERVENTION'
  | 'JOURNEE_TERMINEE'
```

Simplifier `calculerEtat` :

```ts
// Avant
if (openBreak?.type === 'LUNCH') return 'PAUSE_DEJEUNER'
if (openBreak?.type === 'SHORT') return 'EN_PAUSE'

// Après
if (openBreak) return 'PAUSE_DEJEUNER'
```

---

## DayScreen (`src/components/day/DayScreen.tsx`)

**Supprimer** `handleShortBreak` et l'import de `Pause` (Lucide).

**Slots mis à jour :**

| État | sec1 | sec2 |
|---|---|---|
| AU_TRAVAIL | "Pause déjeuner" Coffee amber `handleLunchBreak` visible | EMPTY_SEC |
| EN_PAUSE | ← disparaît (case supprimée) | |
| EN_INTERVENTION | "Pause déjeuner" Coffee amber `handleLunchBreak` visible | EMPTY_SEC |

La case `EN_PAUSE` du switch est supprimée. En AU_TRAVAIL, `sec2` passe de `handleShortBreak` à `EMPTY_SEC`. En EN_INTERVENTION, `sec1` passe de `{ 'Faire une pause', Pause, SHORT }` à `{ 'Pause déjeuner', Coffee, LUNCH }`.

Le `handleLunchBreak` existant est réutilisé tel quel — il appelle déjà `startBreak('LUNCH', key)` avec l'état optimiste `'PAUSE_DEJEUNER'`.

---

## StatusBanner (`src/components/day/StatusBanner.tsx`)

Supprimer la ligne `EN_PAUSE` de la config :

```ts
// Supprimer cette ligne :
EN_PAUSE: { bg: 'var(--ambre)', label: 'En pause', Icon: Pause },
```

---

## Page principale (`src/app/(app)/page.tsx`)

Ligne 41, simplifier la condition du chrono :

```ts
// Avant
if (status === 'EN_PAUSE' || status === 'PAUSE_DEJEUNER') chronoStartAt = openBreak!.startAt.getTime()

// Après
if (status === 'PAUSE_DEJEUNER') chronoStartAt = openBreak!.startAt.getTime()
```

---

## Oubli page (`src/app/(app)/oubli/page.tsx`)

- Supprimer le state `breakType` et le groupe de boutons "Courte pause / Pause déjeuner"
- Toujours passer `breakType: 'LUNCH'` dans le payload quand `entryType === 'BREAK'`
- Supprimer l'import de `useState` si plus utilisé ailleurs dans la page (vérifier)

---

## UX Guidelines (`docs/ux-guidelines.md`)

Mettre à jour la section "3. Machine d'états" :
- Supprimer `EN_PAUSE` de la liste des états
- Mettre à jour le tableau CTA : retirer la ligne EN_PAUSE, mettre à jour EN_INTERVENTION (sec = "Pause déjeuner")
