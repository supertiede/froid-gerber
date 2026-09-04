# DayScreen Redesign — Spec

**Date :** 2026-09-04  
**Approche :** Status Hero  
**Cible :** PWA mobile-first, techniciens terrain, usage intérieur et extérieur

---

## 1. Contexte

La page principale (`/`) est un écran de gestion de journée pour les techniciens de Froid Climatisation Gerber. Elle reflète 6 états distincts et doit permettre des actions rapides (pointage, pause, intervention) dans des conditions difficiles (soleil direct, gants, une main).

**Problèmes actuels :**
- Layout shifts importants : le bloc d'actions change entièrement selon l'état (1 à 3 boutons), causant un reflow de page
- Aucune icône sur les boutons
- Texte tout en majuscules non expressif
- StatusBanner = rectangle plat monochrome sans hiérarchie
- Palette non alignée avec le logo (bleu corporate vs bleu ciel + marine du logo)
- Pas de "temps travaillé net" affiché
- CancellationBanner surgit en popup et décale visuellement

---

## 2. Palette couleurs

Alignée sur les couleurs réelles du logo Froid Climatisation Gerber.

```css
/* Marque */
--bleu-ciel:    #00AADF;   /* bleu logo "FROID CLIMATISATION" + flocon */
--marine:       #1E2173;   /* navy logo "GERBER" */

/* Fond */
--fond:         #EFF6FA;   /* blanc teinté froid */
--surface:      #FFFFFF;

/* Textes */
--encre:        #1E2173;   /* = marine, cohérence logo */
--encre-douce:  #4A6270;   /* texte secondaire — inchangé */
--trait:        #D3DDE3;   /* bordures — inchangé */

/* Sémantique état */
--vert:         #059669;   /* AU_TRAVAIL, arrivée, reprise */
--ambre:        #D97706;   /* EN_PAUSE, PAUSE_DEJEUNER */
--violet:       #7C3AED;   /* EN_INTERVENTION */
--gris-etat:    #64748B;   /* HORS_POSTE, JOURNEE_TERMINEE */
--rouge:        #DC2626;   /* erreur */
```

**Suppression :** `--acier` et `--cuivre` sont supprimés et remplacés par les nouvelles variables.

---

## 3. Structure de page — 4 zones à hauteur fixe

Aucune zone ne change de taille quel que soit l'état. Jamais de `display: none` sur un slot — utiliser `visibility: hidden` + `pointer-events: none`.

```
┌─────────────────────────────────┐
│  HEADER ZONE           56px     │
├─────────────────────────────────┤
│  STATUS CARD          240px     │
├─────────────────────────────────┤
│  ACTION ZONE          216px     │
├─────────────────────────────────┤
│  FEEDBACK ZONE         56px     │  (erreur ou annulation)
└─────────────────────────────────┘
│  BOTTOM NAV            64px     │  (dans layout.tsx, inchangé)
└─────────────────────────────────┘
```

**Total page visible :** 568px + safe-area. Fonctionne sur iPhone SE (667px) et au-delà.

---

## 4. Header Zone (56px)

- **Gauche :** icône flocon `froid-gerber-flocon.png` 24px + date courante en français (ex : "Jeu. 4 sept.") en 13px `--encre-douce`
- **Droite :** "Bonjour, {prénom}" en 15px `--encre`, fontWeight 500
- Fond `--surface`, bordure basse `1px solid --trait`
- Padding horizontal 16px

---

## 5. Status Card (240px)

Fond coloré selon l'état (variable `--couleur-etat`), coins arrondis 0px (pleine largeur), ombre légère en bas.

### Contenu (flex column, centré horizontalement) :

```
[icône Lucide 28px]  [label état 18px semibold]   ← ligne 1, gap 8px
         [CHRONO  56px tabular-nums]               ← toujours visible
    [⏱ Temps travaillé : 1h49  15px]               ← toujours visible
    [Arrivé 08:30 · Pause 15min  13px muted]       ← toujours visible
```

- Tout le texte en blanc `#FFFFFF`
- Le chrono affiche `"–:––"` quand aucun timer ne tourne (HORS_POSTE, JOURNEE_TERMINEE)
- "Temps travaillé" affiche `"–:––"` quand pas de shift démarré
- La ligne arrivée affiche un espace `" "` quand pas de shift (hauteur réservée)

### Mapping état → icône → couleur fond :

| État | Icône Lucide | Couleur fond |
|------|-------------|--------------|
| HORS_POSTE | `MapPin` | `--gris-etat` |
| AU_TRAVAIL | `Briefcase` | `--vert` |
| PAUSE_DEJEUNER | `Coffee` | `--ambre` |
| EN_PAUSE | `Pause` | `--ambre` |
| EN_INTERVENTION | `Wrench` | `--violet` |
| JOURNEE_TERMINEE | `CheckCircle` | `--gris-etat` |

En mode EN_INTERVENTION : le label affiche `client.name` à la place du label générique (comportement actuel conservé).

---

## 6. Action Zone (216px)

3 rangées à hauteur fixe. Les boutons non applicables sont `visibility: hidden` + `pointer-events: none`.

### Rangée 1 — Primary (72px)
- Pleine largeur, padding horizontal 16px
- `height: 72px`, `border-radius: 14px`
- Fond coloré selon l'action, texte blanc 17px semibold
- Icône Lucide 22px à gauche, spinner 20px à droite pendant loading
- `touch-action: manipulation` (supprime le 300ms tap delay)

### Rangée 2 — Secondary (52px, 2 boutons côte à côte)
- Flex row, `gap: 12px`, padding horizontal 16px
- Chaque bouton : `flex: 1`, `height: 52px`, `border-radius: 12px`
- Outline : `1.5px solid couleur-thématique`, fond transparent
- Icône 18px + label 14px semibold

### Rangée 3 — Tertiary (52px, 1 bouton pleine largeur)
- Ghost : pas de bordure, texte + icône, couleur `--encre-douce`
- `height: 52px`, padding horizontal 16px

### Slots par état :

| État | Primary | Sec 1 | Sec 2 | Tertiary |
|------|---------|-------|-------|----------|
| HORS_POSTE | Arrivée (`LogIn`, vert) | Intervention directe (`Wrench`, violet) | Oubli de pointage (`Clock`, encre-douce) | hidden |
| AU_TRAVAIL | Démarrer intervention (`Wrench`, violet) | Pause déjeuner (`Coffee`, ambre) | Faire une pause (`Pause`, ambre) | Fin de journée (`LogOut`, gris-etat) |
| EN_PAUSE / PAUSE_DEJEUNER | Reprendre le travail (`Play`, vert) | hidden | hidden | hidden |
| EN_INTERVENTION | Terminer l'intervention (`CheckSquare`, violet) | Faire une pause (`Pause`, ambre) | hidden | hidden |
| JOURNEE_TERMINEE | Reprendre le travail (`Play`, vert) | Voir ma journée (`CalendarRange`, bleu-ciel) | hidden | hidden |

---

## 7. Feedback Zone (56px)

Zone fixe en bas de la page (au-dessus du BottomNav). Remplace à la fois le bloc erreur flottant et la CancellationBanner popup.

**Mode erreur :**
- Fond `rgba(220,38,38,0.08)`, bordure `1px solid --rouge`, coins 8px
- Icône `AlertCircle` 16px + texte erreur 14px
- `visibility: hidden` quand pas d'erreur

**Mode annulation :**
- Fond `--encre`, texte blanc
- Message 14px à gauche
- Barre de progression (width shrink de 100% → 0% sur 60s, `transition: width linear 1s`) en bas de la zone
- Bouton "Annuler" à droite, 14px semibold blanc
- Prend la priorité sur le mode erreur si les deux coexistent

**Jamais en `display: none` — toujours `visibility: hidden`.**

---

## 8. Nouveau composant : WorkTimer

Calcule le temps de travail net en temps réel.

**Formule :**
```
tempsNet = (maintenant - shift.startAt) - Σ(durée pauses terminées) - durée(pause en cours si active)
```

**Props :**
```typescript
type WorkTimerProps = {
  shiftStartAt: string | null       // ISO string
  breaks: BreakClient[]             // toutes les pauses du shift
  openBreak: BreakClient | null     // pause en cours (endAt null)
}
```

**Comportement :**
- Mise à jour toutes les 30 secondes (comme le Timer existant)
- Affiche `"–:––"` si `shiftStartAt` est null
- Utilise `formatDuration` existant

---

## 9. Modifications fichiers

| Fichier | Action |
|---------|--------|
| `src/app/globals.css` | Mettre à jour la palette (remplacer acier, cuivre, ambre, vert, rouge, ajouter bleu-ciel, marine, violet) |
| `src/components/day/StatusBanner.tsx` | Refonte complète — 240px fixe, icônes, WorkTimer intégré |
| `src/components/day/DayScreen.tsx` | Refonte complète — 4 zones fixes, boutons avec icônes, visibility:hidden |
| `src/components/day/Timer.tsx` | Inchangé |
| `src/components/day/WorkTimer.tsx` | **Nouveau** — calcul temps net |
| `src/components/day/CancellationBanner.tsx` | Refonte — intégrée dans Feedback Zone, barre de progression |
| `src/components/layout/BottomNav.tsx` | Inchangé |
| `src/app/(app)/page.tsx` | Aucun changement — `shift` (qui contient `startAt` et `breaks`) est déjà passé à DayScreen |

---

## 10. Contraintes techniques

- Pas de nouvelle dépendance — Lucide est déjà installé (`lucide-react`)
- IBM Plex Sans conservé
- `touch-action: manipulation` sur tous les boutons (anti tap-delay)
- `prefers-reduced-motion: reduce` respecté sur la barre de progression
- WCAG AA minimum sur tous les textes blancs sur fond coloré (ratio ≥ 4.5:1 vérifié pour chaque couleur d'état)
- `min-h-dvh` à la place de `min-height: 100vh` (comportement correct sur mobile avec chrome du navigateur)
