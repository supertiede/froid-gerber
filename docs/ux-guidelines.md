# UX Guidelines — Froid Climatisation Gerber

PWA mobile-first pour techniciens HVAC. Utilisé sur téléphone, en extérieur, avec les mains occupées. Chaque décision de design part de cette contrainte.

---

## 1. Philosophie générale

- **Zéro ambiguïté** : un seul CTA principal visible à la fois, jamais deux actions de même importance côte à côte.
- **Zéro saut de layout** : toutes les zones ont une hauteur fixe. On masque avec `visibility: hidden`, jamais avec `display: none`.
- **Zéro notification intrusive** : les erreurs passent en overlay flottant (Snackbar), pas en zone réservée qui décale la page.
- **Feedback immédiat** : vibration (15ms) + update optimiste du statut avant même la réponse serveur.
- **Offline-first** : les actions s'enfilent dans l'outbox IndexedDB et se rejouent à la reconnexion.

---

## 2. Architecture de la page d'accueil (DayScreen)

La page est une colonne flex avec des zones à hauteur fixe. Aucune zone ne redimensionne les autres.

```
┌──────────────────────────────┐
│  HEADER           56px fixe  │  logo + date + prénom
├──────────────────────────────┤
│  STATUS BANNER   240px fixe  │  couleur d'état + chrono + WorkTimer
├──────────────────────────────┤
│  ACTION ZONE     152px fixe  │  1 primary + 2 secondary
│  (hidden si inactif)         │  paddingTop 16 + primary 72 + gap 12 + row 52
├──────────────────────────────┤
│  SPACER          flex: 1     │  pousse le bas vers le bas
├──────────────────────────────┤
│  SHIFT BUTTON     88px fixe  │  toujours visible, 3 états
├──────────────────────────────┤
│  SNACKBAR        overlay     │  position: fixed, zéro impact layout
└──────────────────────────────┘
```

**Règle d'or** : si un élément n'est pas pertinent dans un état donné, il garde sa hauteur réservée (`visibility: hidden + pointerEvents: none`). Il ne disparaît jamais.

---

## 3. Machine d'états (EtatJournee)

```ts
type EtatJournee =
  | 'HORS_POSTE'       // pas de shift ouvert
  | 'AU_TRAVAIL'       // shift ouvert, pas de break ni intervention
  | 'PAUSE_DEJEUNER'   // break ouvert
  | 'EN_INTERVENTION'  // intervention ouverte
  | 'JOURNEE_TERMINEE' // shift fermé (endAt non null)
```

Matrice CTA par état :

| État            | Shift Button         | Primary Action Zone        | Secondaires           |
|-----------------|----------------------|----------------------------|-----------------------|
| HORS_POSTE      | "Arrivée" (vert)     | zone cachée                | —                     |
| AU_TRAVAIL      | "Fin de journée" (encre) | "Démarrer une intervention" (violet) | Pause déjeuner |
| PAUSE_DEJEUNER  | "Fin de journée" (encre) | "Reprendre le travail" (vert) | —               |
| EN_INTERVENTION | "Fin de journée" (encre) | "Terminer l'intervention" (violet) | Pause déjeuner |
| JOURNEE_TERMINEE | "Reprendre le travail" (vert) | zone cachée           | —                     |

---

## 4. Palette de couleurs

Variables CSS définies dans `src/app/globals.css` :

```css
--bleu-ciel:    #007BA5   /* marque, focus ring, liens actifs */
--encre:        #1E2173   /* texte principal, "Fin de journée" */
--encre-douce:  #4A6270   /* texte secondaire, labels inactifs */
--fond:         #EFF6FA   /* background de page */
--surface:      #FFFFFF   /* cards, header, bottom nav */
--trait:        #D3DDE3   /* séparateurs, bordures */

/* États sémantiques */
--vert:         #059669   /* actif, arrivée, reprise */
--ambre:        #B45309   /* pause (déjeuner ou courte) */
--violet:       #7C3AED   /* intervention */
--gris-etat:    #64748B   /* états neutres (HORS_POSTE, JOURNEE_TERMINEE) */
--rouge:        #DC2626   /* erreurs */
```

**Règle** : toujours utiliser les variables CSS, jamais les hex directement dans les composants.

Correspondance état → couleur StatusBanner :
- HORS_POSTE → `--gris-etat`
- AU_TRAVAIL → `--vert`
- PAUSE_DEJEUNER → `--ambre`
- EN_INTERVENTION → `--violet`
- JOURNEE_TERMINEE → `--gris-etat`

---

## 5. Tokens de spacing et tailles

| Élément               | Valeur                          |
|-----------------------|---------------------------------|
| Bouton primary        | `height: 72`, `borderRadius: 14`, `fontSize: 17`, `fontWeight: 600` |
| Bouton secondary      | `height: 52`, `borderRadius: 12`, `fontSize: 13`, `fontWeight: 600`, `border: 1.5px solid` |
| Bouton icon size      | primary: `22`, secondary: `18` |
| Marge latérale        | `16px` (padding ou calc 100% - 32px) |
| Gap entre boutons     | `12px` |
| Gap icon + label      | primary: `10px`, secondary: `6px` |
| Header height         | `56px` |
| StatusBanner height   | `240px` |
| BottomNav height      | `64px`, `zIndex: 40` |
| Snackbar zIndex       | `50` |

---

## 6. Boutons — règles de style

### Primary button
```ts
const primaryStyle = (color: string): CSSProperties => ({
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
```

### Secondary button (outlined)
```ts
const secondaryStyle = (color: string, visible: boolean): CSSProperties => ({
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
```

**Règles** :
- Toujours `touchAction: 'manipulation'` (supprime le délai de 300ms sur mobile).
- `opacity: 0.7` quand `loading`, jamais `display: none`.
- `disabled` + `aria-busy={loading}` sur le bouton pendant un appel en cours.

---

## 7. Feedback tactile

```ts
function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(15)
}
```

Appelé avant chaque action primaire (clockIn, endDay, startBreak, endIntervention…). 15ms = confirmation sans être intrusif.

---

## 8. Snackbar (système de notification)

Composant overlay flottant — **ne réserve aucun espace dans le layout**.

### Architecture
- `src/components/ui/Snackbar.tsx` — composant visuel pur
- `src/hooks/useSnackbar.tsx` — hook qui gère l'état et retourne `{ showError, snackbarNode }`

### Utilisation dans un composant
```tsx
const { showError, snackbarNode } = useSnackbar()

// Dans le JSX, en dernier enfant :
{snackbarNode}

// Pour déclencher :
showError("Message d'erreur")
```

### Comportement
- Slide-up (220ms) à l'apparition, slide-down à la disparition
- Auto-dismiss après **4 secondes**
- Tap n'importe où sur le snackbar → dismiss immédiat
- Appel multiple → reset du timer, même composant réutilisé (key incrémentée pour relancer l'animation)
- `role="alert"` + `aria-live="assertive"` pour l'accessibilité
- Position : `bottom: calc(64px + env(safe-area-inset-bottom) + 12px)` — au-dessus de la BottomNav, safe-area aware

### Animations dans globals.css
```css
@keyframes snack-in  { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
@keyframes snack-out { from { opacity: 1; transform: translateY(0) }     to { opacity: 0; transform: translateY(12px) } }
```

---

## 9. Visibilité conditionnelle — règle fondamentale

**Toujours `visibility: hidden` + `pointerEvents: none`, jamais `display: none`.**

`display: none` supprime l'élément du flux et provoque un saut de layout. `visibility: hidden` conserve l'espace réservé.

```tsx
// ✅ Correct
style={{
  visibility: isVisible ? 'visible' : 'hidden',
  pointerEvents: isVisible ? 'auto' : 'none',
}}

// ❌ Interdit dans les zones fixes
style={{
  display: isVisible ? 'flex' : 'none',
}}
```

Exception admise : les éléments **en dehors des zones fixes** (ex. contenu conditionnel dans une zone de scroll) peuvent utiliser `display: none`.

---

## 10. Optimistic UI + offline

### Pattern executeWithOutbox
Toutes les actions du DayScreen passent par ce pattern :

```ts
async function executeWithOutbox<T>(
  idempotencyKey: string,
  type: string,
  payload: Record<string, unknown>,
  onlineAction: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
  optimisticStatus: EtatJournee,
) {
  if (loading) return
  vibrate()
  setLoading(true)
  setStatus(optimisticStatus)          // update UI immédiatement
  if (!navigator.onLine) {
    await enqueueAction(...)           // met en file IndexedDB
    setLoading(false)
    return
  }
  const result = await onlineAction()
  if (!result.ok) {
    showError(result.error)
    setStatus(initialStatus)           // rollback
  }
  setLoading(false)
  refresh()
}
```

### Idempotency
Chaque mutation côté serveur vérifie d'abord `findFirst({ where: { idempotencyKey } })`. Si déjà existant → retourne early sans erreur. Permet de rejouer sans doublon en cas d'offline.

---

## 11. Invariants métier

Ces règles sont enforçées côté serveur (server actions), **pas côté client** :

- **Un seul shift par jour calendaire** (Europe/Paris). Vérification dans `clockIn` avec `startAt: { gte: startOfDayParis(now()) }`.
- **`resumeDay` rouvre le shift existant** — il ne crée jamais un nouveau shift si un shift existe déjà dans la journée.
- **Minuit automatique** : cron `0 22,23 * * *` (UTC) qui clôt le shift en cours à minuit Paris et ouvre le jour suivant.

---

## 12. Timezone

Tout ce qui concerne les dates de journée utilise **Europe/Paris**.

```ts
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfDay } from 'date-fns'

const TZ = 'Europe/Paris'

// Début de la journée courante en UTC
function startOfDayParis(date: Date): Date {
  return fromZonedTime(startOfDay(toZonedTime(date, TZ)), TZ)
}
```

Ne jamais utiliser `new Date().toLocaleDateString()` pour comparer des jours — passer systématiquement par `startOfDayParis`.

---

## 13. Iconographie

Bibliothèque unique : **Lucide React**. Tailles standardisées :
- Actions primaires : `size={22}`
- Actions secondaires : `size={18}`
- Inline / labels : `size={13}` à `size={16}`

Icônes associées aux états / actions :
- Arrivée → `LogIn`
- Fin de journée → `LogOut`
- Reprendre → `Play`
- Intervention → `Wrench`
- Terminer intervention → `CheckSquare`
- Déjeuner → `Coffee`
- Erreur → `AlertCircle`
- Navigation bas : `CalendarDays`, `Wrench`, `CalendarRange`, `Settings`

---

## 14. Accessibilité

- `role="status"` sur le StatusBanner (annonce les changements d'état)
- `role="alert"` + `aria-live="assertive"` sur le Snackbar
- `aria-busy={loading}` sur les boutons pendant un appel
- `aria-label` sur les boutons icon-only
- `aria-current="page"` dans la BottomNav
- Focus ring : `outline: 3px solid var(--bleu-ciel)` via `:focus-visible`
- `prefers-reduced-motion` : toutes les animations réduites à `0.01ms` via media query globale

---

## 15. Styles — convention générale

- **Inline styles via `CSSProperties`** — pas de classes Tailwind dans les composants app (sauf si explicitement choisi).
- Les animations CSS (keyframes) sont déclarées dans `src/app/globals.css`.
- Les variables CSS sont dans `:root` de `globals.css`.
- `flexShrink: 0` sur toutes les zones à hauteur fixe pour empêcher la compression.
- `minHeight: '100dvh'` sur le conteneur racine (pas `100vh` — évite le bug de l'URL bar mobile).

---

## 16. Server actions — conventions

```ts
'use server'
// ⚠️ Ce fichier ne peut exporter QUE des fonctions async.
// Les constantes et types partagés vont dans un fichier séparé (ex: src/lib/xxx/types.ts)

export async function monAction(param: string) {
  const session = await getSession()   // toujours vérifier la session en premier
  // ...
  revalidatePath('/')                  // invalider les caches concernés
  return { ok: true as const, data: result }
  // ou en erreur :
  return { ok: false as const, error: 'Message utilisateur' }
}
```

Pattern de retour uniforme : `{ ok: true, data? }` | `{ ok: false, error: string }`.

---

## 17. Pagination lazy (interventions)

- Curseur = `startAt` (ISO string) du dernier item affiché
- Query : `where: { startAt: { lt: new Date(cursor) } }, orderBy: { startAt: 'desc' }, take: 20`
- `IntersectionObserver` sur un sentinel en bas de liste, `rootMargin: '200px'` pour pré-charger
- Guard `loadingRef` + `cursorRef` pour éviter les appels dupliqués

---

## 18. Animations globales

Toutes dans `src/app/globals.css` :

| Classe / keyframe     | Usage                         | Durée         |
|-----------------------|-------------------------------|---------------|
| `modal-overlay-in/out` | Overlay modal                | 180ms / 150ms |
| `modal-content-in/out` | Contenu modal                | 200ms / 160ms |
| `snack-in / snack-out` | Snackbar                     | 220ms         |
| `mic-pulse`            | Enregistrement vocal         | 1s infinite   |

Les classes `modal-overlay` et `modal-content` sont activées via `data-state="open|closed"`.
