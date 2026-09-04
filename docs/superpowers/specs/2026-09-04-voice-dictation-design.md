# Voice Dictation — WorkReportForm

**Date:** 2026-09-04  
**Scope:** Ajout d'un bouton micro dans le textarea de compte-rendu d'intervention

---

## Contexte

La page de fin d'intervention (`/intervention/[id]/fin`) contient un textarea libre où le technicien décrit ce qu'il a fait. La saisie sur mobile est fastidieuse sur le terrain. La Web Speech API permet la dictée vocale sans lib externe, mais n'est pas disponible partout (Firefox ne la supporte pas).

---

## Décisions

| Sujet | Décision |
|-------|----------|
| Placement | Dans le textarea, coin bas-droit (position absolute) |
| Texte existant | La dictée s'ajoute à la suite |
| Arrêt | Manuel uniquement (tap bouton) |
| Disponibilité | Bouton rendu uniquement si `SpeechRecognition` détecté au mount |

---

## Architecture

### Composant : `useSpeechRecognition` (hook)

Hook isolé, réutilisable, qui encapsule toute la logique Web Speech API.

```ts
// src/hooks/useSpeechRecognition.ts
interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  interimText: string
  start: () => void
  stop: () => void
  onFinalResult: (cb: (text: string) => void) => void
}
```

**Détails :**
- Détecte `window.SpeechRecognition || window.webkitSpeechRecognition` au mount
- `isSupported: false` côté serveur (SSR-safe via `useState` initialisé à `false`)
- `lang: 'fr-FR'`
- `continuous: true` — ne s'arrête pas automatiquement après un silence
- `interimResults: true` — expose le texte en cours de transcription
- `onresult` : sépare `isFinal` (callback vers le parent) vs interim (état interne)
- `onerror` : log silencieux, `isListening` repasse à `false`
- `onend` : `isListening` repasse à `false` (sécurité si le browser coupe)

### Composant : `WorkReportForm` (modifié)

- Importe `useSpeechRecognition`
- Si `isSupported: false` → aucune différence visuelle
- Si `isSupported: true` → rend le bouton micro dans le textarea
- `onFinalResult` : `setFreeText(prev => prev ? prev + ' ' + text : text)`
- Affiche `interimText` en superposition visuelle (voir UI)

---

## UI

### Structure HTML

```
<div style="position: relative">
  <textarea style="padding-right: 56px" />
  {isSupported && (
    <button style="position: absolute; bottom: 8px; right: 8px" />
  )}
</div>
```

### Textarea

- Padding-right `56px` uniquement quand `isSupported: true` (sinon `16px`)
- Pendant l'enregistrement : `border-color: var(--rouge)`
- La valeur affichée = `freeText + (isListening && interimText ? ' ' + interimText : '')`  
  → Le textarea est en `readOnly` pendant l'écoute pour éviter les conflits de saisie

### Bouton micro

| État | Apparence |
|------|-----------|
| Idle | Icône `Mic` (lucide), couleur `var(--encre-douce)`, fond transparent, border `var(--trait)` |
| Recording | Fond `var(--rouge)`, icône `MicOff` blanc, animation pulse opacity |

**Animation pulse (CSS keyframe) :**
```css
@keyframes mic-pulse {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.65 }
}
```
Pas de `transform: scale` → pas de layout shift.

### Accessibilité

- `aria-label="Démarrer la dictée"` / `"Arrêter la dictée"` selon l'état
- `aria-pressed={isListening}`

---

## Gestion des erreurs

| Erreur | Comportement |
|--------|-------------|
| `not-allowed` (permission refusée) | `isListening: false`, silencieux (l'utilisateur a refusé volontairement) |
| `network` | `isListening: false`, silencieux |
| Navigateur coupe l'écoute | `onend` remet `isListening: false` |

Pas de toast d'erreur — l'absence de dictée est auto-explicative.

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `src/hooks/useSpeechRecognition.ts` | Créer |
| `src/components/intervention/WorkReportForm.tsx` | Modifier |
| `src/app/globals.css` | Ajouter `@keyframes mic-pulse` |

---

## Non-inclus (hors scope)

- Toast ou feedback d'erreur explicite
- Support Firefox (non supporté par la Web Speech API)
- Historique des dictées
- Langues multiples
