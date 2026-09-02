# Spec — Application de pointage Froid Gerber

**Date :** 2026-09-02
**Client :** INSTALLATIONS FRIGOR CH.GERBER & CIE (Froid Gerber), Illkirch-Graffenstaden
**Utilisateurs :** frigoristes salariés (~14 personnes)
**Nature :** PWA mobile-first, usage exclusivement sur smartphone

---

## 1. Objectif

Remplacer le relevé d'heures papier. Le technicien pointe ses arrivées/pauses/départs et ses interventions client depuis son téléphone. Chaque dimanche soir à 23h59, un PDF récapitulatif hebdomadaire est envoyé automatiquement par email.

**Critère de réussite unique :** un frigoriste de 55 ans, avec des gants, en plein soleil, sur un toit, pointe en moins de 3 secondes sans réfléchir.

---

## 2. Scope — ce qu'on construit

### Inclus (6 lots)
- Écran Journée (machine à états, pointage)
- Écran Interventions (nouvelle, compte rendu, liste, édition)
- Écran Ma semaine (récapitulatif personnel)
- Écran Rattrapage `/oubli`
- Rapport PDF hebdomadaire automatique (cron dimanche 23h59)
- PWA hors ligne (Serwist)

### Exclu de v1
- Interface admin (gestion via code/Claude)
- Gestion des utilisateurs en UI (créés en base directement)
- Excel/XLSX
- Géolocalisation
- Planning, devis, CERFA, facturation
- Mode sombre
- Multilingue

---

## 3. Stack technique

| Brique | Choix |
|---|---|
| Framework | Next.js 16, App Router, Server Actions |
| UI | React 19 + Tailwind CSS 4 |
| Composants | shadcn/ui (primitives uniquement) |
| ORM | Prisma 7 (`prisma.config.ts`, output `@/generated/prisma`) |
| Base | Neon Postgres — projet existant `steep-thunder-87739326`, nouvelle DB `froid-gerber` |
| Auth | Better Auth, plugin `username` |
| Email | Resend (variable d'env placeholder — config domaine à la fin) |
| PDF | `@react-pdf/renderer` |
| Cron | Vercel Cron (plan Pro) |
| PWA | Serwist |
| Dates | `date-fns` + `date-fns-tz` |
| Validation | Zod 4 |
| Hébergement | Vercel (team `alexandres-projects-d7d253b5`) |
| Repo | GitHub `supertiede/froid-gerber` |

**Ce qu'on n'utilise pas :** state manager global, tRPC, Edge runtime, i18n, exceljs.

---

## 4. Authentification

### Flux
- Better Auth avec plugin `username` (pas d'email requis pour les techniciens)
- Admin crée les comptes en base directement (username + mot de passe temporaire + flag `doitChangerMotDePasse: true`)
- À la 1ère connexion : redirection automatique vers `/changer-mot-de-passe`
- Après changement : flag → `false`, redirection vers `/`
- Mot de passe oublié : l'admin remet un mot de passe temporaire en base

### Sessions
- Durée : **90 jours**, renouvelée à chaque ouverture
- Cookies `httpOnly` + `secure` + `sameSite: lax`
- Pas de bouton "Déconnexion" visible sur l'écran principal — uniquement dans `/reglages`

### Format username
- `prenomnom` tout en minuscules sans espace (ex: `alexandred`, `jean-luccarpentier`)
- Généré à la création, immutable

---

## 5. Modèle de données

Principe : **intervalles, pas journal d'événements.** Chaque entité a `debutAt` + `finAt`.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum PauseType {
  DEJEUNER
  COURTE
}

enum Origine {
  APP        // horodatage serveur au moment du tap
  MANUEL     // saisi après coup par le technicien
}

enum TypeIntervention {
  CLIENT
  ATELIER
}

model User {
  id                    String   @id @default(cuid())
  username              String   @unique
  name                  String   // Prénom Nom affiché dans l'UI
  actif                 Boolean  @default(true)
  doitChangerMotDePasse Boolean  @default(true)
  createdAt             DateTime @default(now())

  postes        Poste[]
  interventions Intervention[]
  clientsCrees  Client[]       @relation("ClientCreePar")

  // Champs Better Auth : sessions, comptes (générés par la migration Better Auth)
}

model Client {
  id           String   @id @default(cuid())
  nom          String
  nomNormalise String   @unique  // minuscules, sans accents
  actif        Boolean  @default(true)
  createdAt    DateTime @default(now())
  creeParId    String?
  creePar      User?    @relation("ClientCreePar", fields: [creeParId], references: [id])

  interventions Intervention[]

  @@index([actif, nom])
}

model Poste {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  debutAt      DateTime
  finAt        DateTime?
  origineDebut Origine   @default(APP)
  origineFin   Origine?
  cleClient    String?   @unique  // idempotence hors ligne
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  pauses       Pause[]

  @@index([userId, debutAt])
}

model Pause {
  id           String    @id @default(cuid())
  posteId      String
  poste        Poste     @relation(fields: [posteId], references: [id], onDelete: Cascade)
  type         PauseType
  debutAt      DateTime
  finAt        DateTime?
  origineDebut Origine   @default(APP)
  origineFin   Origine?
  cleClient    String?   @unique
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([posteId, debutAt])
}

model Intervention {
  id            String           @id @default(cuid())
  userId        String
  user          User             @relation(fields: [userId], references: [id])
  type          TypeIntervention
  clientId      String?
  client        Client?          @relation(fields: [clientId], references: [id])
  debutAt       DateTime
  finAt         DateTime?
  trajetMinutes Int              @default(0)  // aller ; compté ×2 dans les calculs
  compteRendu   String?
  origine       Origine          @default(APP)
  cleClient     String?          @unique
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@index([userId, debutAt])
  @@index([clientId, debutAt])
}

model Modification {
  id        String   @id @default(cuid())
  entite    String   // "Poste" | "Pause" | "Intervention"
  entiteId  String
  champ     String
  ancienne  String?
  nouvelle  String?
  parUserId String
  at        DateTime @default(now())
  motif     String?

  @@index([entite, entiteId])
}

model RapportHebdo {
  id            String    @id @default(cuid())
  semaineIso    String    @unique  // "2026-W36"
  envoyeAt      DateTime?
  destinataires String[]
  statut        String    // "EN_ATTENTE" | "ENVOYE" | "ECHEC"
  erreur        String?
  verrouillee   Boolean   @default(false)
}
```

**Contraintes applicatives (vérifiées en transaction) :** un seul `Poste` ouvert par user, une seule `Pause` ouverte par poste, une seule `Intervention` ouverte par user.

**Fuseau horaire :** tout stocké en UTC, affiché en `Europe/Paris` via `src/lib/temps.ts` uniquement.

---

## 6. Règles de calcul (`src/lib/calculs.ts`)

```
duréePoste        = finAt − debutAt
duréePauses       = Σ (pause.finAt − pause.debutAt)
heuresTravaillées = duréePoste − duréePauses

duréeIntervention = finAt − debutAt
tempsInterv       = duréeIntervention + (2 × trajetMinutes)

heuresSemaine     = Σ heuresTravaillées des jours
heuresParClient   = Σ tempsInterv groupé par client
tempsNonAffecté   = heuresTravaillées − Σ tempsInterv (par jour)
```

- Aucun arrondi sur les données brutes. Format d'affichage : `h:mm`.
- Poste sans `finAt` en fin de journée → affiché "en cours", exclu des totaux.

---

## 7. Routes

```
/login                        Connexion
/changer-mot-de-passe         Obligatoire à la 1ère connexion
/                             Journée (écran principal)
/intervention/nouvelle        Démarrage
/intervention/[id]            Détail / édition
/intervention/[id]/fin        Compte rendu
/interventions                Liste (aujourd'hui + historique)
/semaine                      Récapitulatif personnel
/oubli                        Saisie manuelle d'un pointage passé
/reglages                     Profil, déconnexion
```

---

## 8. Écran principal `/` — Machine à états

Bandeau de couleur pleine en haut + bouton d'action principal en zone pouce.

| État | Couleur bandeau | Action principale | Actions secondaires |
|---|---|---|---|
| Hors poste | Gris `#5A6E7A` | JE SUIS ARRIVÉ | Démarrer une intervention · J'ai oublié de pointer |
| Au travail | Vert `#0E6B45` | DÉMARRER UNE INTERVENTION | Pause déjeuner · Faire une pause · Fin de journée |
| Pause déjeuner | Ambre `#8A5A12` | REPRENDRE LE TRAVAIL | — |
| En pause | Ambre `#8A5A12` | REPRENDRE LE TRAVAIL | — |
| En intervention | Cuivre `#9A4B1F` | TERMINER L'INTERVENTION | Faire une pause |
| Journée terminée | Acier `#0B5FA5` | REPRENDRE LE TRAVAIL | Voir ma journée |

**Règles :**
- Démarrer une intervention pointe implicitement l'arrivée si pas encore pointé (A2)
- Vibration courte (`navigator.vibrate(15)`) à chaque pointage
- Annulation 60 s après chaque action (bandeau bas)
- Clé d'idempotence UUID sur chaque action (A4)
- Chrono basé sur l'horodatage serveur, pas `Date.now()`

---

## 9. Direction visuelle

**Fond clair** (lisibilité soleil). **IBM Plex Sans** (chiffres tabulaires, glyphes distincts).

```css
:root {
  --fond:        #F2F5F7;
  --surface:     #FFFFFF;
  --trait:       #D3DDE3;
  --encre:       #10202B;
  --encre-douce: #4A6270;
  --acier:       #0B5FA5;
  --vert:        #0E6B45;
  --ambre:       #8A5A12;
  --cuivre:      #9A4B1F;
  --gris-etat:   #5A6E7A;
  --rouge:       #A32B24;
}
```

| Élément | Règle |
|---|---|
| Bouton principal | 96 px haut, pleine largeur −16 px, rayon 12 px, texte 20 px |
| Bouton secondaire | 64 px, contour 2 px |
| Ligne tapable | 56 px minimum |
| Cibles tactiles | ≥ 56 px |
| Corps minimum | 18 px / 500 |
| Aucune ombre | Surfaces par trait et fond uniquement |
| Gestes | Tap uniquement — pas de swipe, pas d'appui long |
| Vouvoiement | Partout dans l'interface |

---

## 10. Hors ligne (Serwist)

1. Service worker : cache app shell, stale-while-revalidate pour la lecture
2. Outbox IndexedDB (`idb`) : chaque pointage écrit localement avant tout appel réseau
3. UUID `cleClient` sur chaque action → idempotence en cas de double rejeu
4. Rejeu à la reconnexion (`online`) avec backoff exponentiel
5. Horodatage hors ligne : serveur accepte si < 24 h, marque `origine = MANUEL`
6. Bandeau discret "Hors ligne — N pointages en attente" sur l'écran Journée

---

## 11. Rapport hebdomadaire

**Déclenchement :** Vercel Cron `59 22 * * 0` (UTC) — soit 23h59 heure de Paris en heure d'hiver. En heure d'été (UTC+2), le cron se déclenche à 00h59 lundi Paris, d'où une garde applicative : la route vérifie qu'on est dimanche ou lundi 00h–01h Paris avant de générer.

**Format :** email HTML (tables inline, 600 px, compatible Outlook) + **PDF en pièce jointe** (`@react-pdf/renderer`).

**Contenu :**
1. Synthèse équipe : tableau tous techniciens × jours + total semaine
2. Répartition heures par client (tous techniciens)
3. Fiche par technicien : pointages du jour + détail interventions + anomalies

**Route `/api/cron/rapport-hebdo` :**
1. Vérifie `Authorization: Bearer CRON_SECRET`
2. Garde fuseau Paris (dimanche 21h–01h)
3. Idempotence : abandonne si `RapportHebdo` existe déjà pour la semaine
4. Agrège, génère PDF, envoie via Resend, verrouille la semaine
5. Échec → `statut = ECHEC` + email admin

**Destinataires :** variable d'env `RAPPORT_DESTINATAIRES` (liste séparée par virgules).

---

## 12. Sécurité

- Better Auth : sessions en base, cookies `httpOnly` + `secure` + `sameSite: lax`
- Toutes les Server Actions revalidident session côté serveur
- Un technicien ne lit/écrit que ses propres données
- Rate limiting sur `/login` et routes de pointage
- `CRON_SECRET` sur la route rapport
- Aucun secret en code client

---

## 13. Conventions de code

- TypeScript strict, zéro `any`
- Server Components par défaut, `"use client"` uniquement si état ou événement
- Server Actions pour toutes les écritures, Zod 4 en entrée
- Pas de `fetch` interne depuis le client pour la lecture
- Dates : `src/lib/temps.ts` uniquement pour les conversions TZ
- Durées : entiers de minutes dans le métier, `formatHHMM()` pour l'affichage
- Nommage : domaine en français (`Poste`, `Pause`, `trajetMinutes`), infra en anglais
- Un fichier = une responsabilité. Calculs métier dans `src/lib/calculs.ts`, testés unitairement

---

## 14. Lots de livraison

| Lot | Contenu | Critère d'acceptation |
|---|---|---|
| 0 | Next.js 16, Prisma 7, Better Auth, Vercel, design tokens, IBM Plex Sans, layout barre d'onglets | URL production accessible, connexion OK, requête Prisma OK |
| 1 | Écran `/` complet (machine à états, 6 états, chrono, annulation 60 s, haptique), `/oubli` | Journée complète enregistrée, durées exactes |
| 2 | `/intervention/nouvelle`, `/intervention/[id]/fin`, `/interventions`, recherche client, chips compte rendu, pointage implicite A2 | 3 interventions consécutives avec bons totaux |
| 3 | `/intervention/[id]` édition bottom sheet, journal `Modification`, `/semaine` + détection écarts | Modifier heure de fin → total mis à jour + trace dans Modification |
| 4 | Rapport PDF, route cron, email Resend | Rapport reçu dans Gmail et Apple Mail, totaux corrects |
| 5 | Serwist PWA, outbox IndexedDB, rejeu, bandeau hors ligne | Journée complète saisie en mode avion, remonte à la reconnexion une seule fois |
| 6 | Accessibilité, performance téléphone bas de gamme, page conformité, purge 5 ans | — |
