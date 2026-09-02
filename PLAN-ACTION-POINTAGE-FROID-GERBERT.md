# Plan d'action — Application de pointage & suivi d'interventions

**Client :** Froid Gerbert (nom à confirmer — voir §14)
**Utilisateurs :** frigoristes salariés + 1 à 2 administrateurs
**Nature :** PWA mobile-first, usage exclusivement sur smartphone
**Destinataire de ce document :** Claude Code

---

## 1. Objectif du produit

Remplacer le relevé d'heures papier par une application où le frigoriste :

1. pointe son arrivée, ses pauses, son départ ;
2. démarre / arrête ses interventions avec le client concerné, le temps de trajet et un compte rendu ;
3. peut corriger a posteriori ce qu'il a saisi.

Et où l'entreprise reçoit **chaque vendredi soir par email** un récapitulatif hebdomadaire complet, prêt à être utilisé pour la paie et la facturation.

**Critère de réussite unique :** un frigoriste de 55 ans, avec des gants, en plein soleil, sur un toit, doit pouvoir pointer en moins de 3 secondes sans réfléchir. Tout le reste du document découle de cette phrase.

---

## 2. Contraintes non négociables

| # | Contrainte | Conséquence technique |
|---|---|---|
| C1 | Public non familier des applications | 1 action principale par écran, aucun jargon, aucun réglage caché |
| C2 | Usage avec des gants, en extérieur | Cibles tactiles ≥ 56 px, contrastes forts, pas de gestes complexes |
| C3 | Sous-sols, chambres froides, parkings → réseau absent | Écriture locale d'abord, file de synchronisation, jamais d'écran bloqué |
| C4 | Les heures servent à la paie | Horodatage **serveur**, jamais l'heure du téléphone ; traçabilité de toute modification |
| C5 | Mobile uniquement | Aucun effort sur le responsive desktop hors interface admin |
| C6 | Données RH nominatives | RGPD : minimisation, conservation bornée, information des salariés (§13) |

---

## 3. Stack technique et versions

| Brique | Choix | Version cible (septembre 2026) |
|---|---|---|
| Framework | Next.js, App Router, Server Actions | 16.3.x (Active LTS) |
| UI | React 19 + Tailwind CSS 4 | — |
| Composants | shadcn/ui, uniquement les primitives utilisées | — |
| ORM | Prisma | 7.x |
| Base | Neon Postgres via `@prisma/adapter-neon` | 7.3.x |
| Auth | Better Auth (adaptateur Prisma) | dernière stable |
| Email | Resend | — |
| Planification | Vercel Cron | — |
| Hébergement | Vercel | — |
| Dates | `date-fns` + `date-fns-tz` | — |
| Validation | Zod | — |

### Pièges à connaître avant d'écrire la première ligne

**Prisma 7** a changé plusieurs conventions par rapport à Prisma 5/6 :

- La connexion se configure dans `prisma.config.ts` et via l'adaptateur. **Pas** de propriété `url` dans le bloc `datasource` du `schema.prisma`.
- Le client s'importe depuis le chemin de sortie généré (ex. `@/generated/prisma`), **pas** depuis `@prisma/client`.
- `@prisma/adapter-neon` embarque le driver Neon. **Ne pas** installer `@neondatabase/serverless` ni `ws` séparément.
- Deux chaînes de connexion : `DATABASE_URL` (pooled, hostname avec `-pooler`) pour l'application, `DATABASE_URL_UNPOOLED` (direct) pour les migrations via la CLI Prisma.

**Vercel Cron** : les crons sont déclenchés en **UTC** et ne gèrent pas le changement d'heure. Sur le plan Hobby, la fréquence et la fenêtre de déclenchement sont limitées — vérifier le plan du compte avant de s'appuyer dessus. Voir §11 pour la stratégie retenue.

**Runtime** : garder les routes qui touchent la base sur le runtime Node.js, pas Edge. Aucun besoin d'Edge ici, et cela évite toute une classe de problèmes de connexions.

### Ce qu'on n'utilise pas

Pas de state manager global (Zustand/Redux) — Server Components + `useState` local suffisent. Pas de librairie de graphiques. Pas d'i18n. Pas de mode sombre en v1. Pas de tRPC : Server Actions uniquement.

---

## 4. Benchmark de l'existant

### 4.1 Outils de pointage généralistes

| Outil | Ce qu'il fait bien | Ce qu'on ne reprend pas |
|---|---|---|
| **Connecteam** | Référence sur les équipes terrain : GPS, géofencing, pointage lié à un job/client. | Suite complète (RH, chat, formation) — hors sujet. Le mode kiosque ne fonctionne pas hors ligne. |
| **Jibble** | Reconnaissance faciale et géolocalisation gratuites, anti-badgeage pour autrui. | La reconnaissance faciale est disproportionnée ici (§13) et les utilisateurs remontent des problèmes de synchronisation multi-appareils. |
| **Clockify** | Interface simple, un chrono, export propre. | Pensé pour du travail de bureau / projet, pas pour le terrain. Plan gratuit plafonné à 5 utilisateurs depuis avril 2026. |
| **Buddy Punch / ClockShark** | Ciblent explicitement les métiers terrain dont le CVC. | Anglophones, tarification par utilisateur. |

**Enseignement principal du segment :** tous ces outils séparent *le pointage horaire* et *l'affectation du temps à un client*. C'est une friction : le technicien fait deux gestes pour une seule action réelle. Notre application peut fusionner les deux (voir amélioration A2).

### 4.2 Outils métier frigoriste (France)

| Outil | Positionnement | Ce qu'on retient |
|---|---|---|
| **Organilog** | Gestion d'intervention froid + CERFA 15497 + pointage mobile intégré au calcul du temps de travail. | La combinaison pointage + intervention dans un même outil est la bonne direction. L'application guide l'opérateur étape par étape. |
| **Kizeo Forms** | Formulaires terrain 100 % hors ligne, y compris en chambre froide à −18 °C. | Le hors-ligne total est un prérequis du métier, pas une option. |
| **Praxedo** | Gestion d'interventions, conformité CERFA, rapport envoyé au client. | Argument central : le technicien doit passer moins de temps à remplir des formulaires. |
| **XT-ERP** | ERP froid industriel complet, app mobile hors ligne. | Trop lourd, mais confirme la norme hors ligne du secteur. |

**Constat transversal du secteur :** interface avec icônes larges, navigation simple, **compatibilité avec des gants** — c'est une exigence explicitement formulée par les éditeurs du domaine, pas un raffinement.

### 4.3 Ce que fait notre application que les autres ne font pas

1. **Périmètre volontairement minuscule.** Pas de devis, pas de CERFA, pas de planning, pas de stock, pas de facturation. Six actions, un rapport.
2. **Une seule machine à états visible.** L'écran d'accueil ne propose jamais plus d'une action principale.
3. **Le trajet est un champ de premier ordre**, pas un calcul GPS approximatif : le technicien saisit ses minutes, elles sont comptées à l'aller et au retour.
4. **Aucune surveillance.** Pas de GPS, pas de photo, pas de reconnaissance faciale par défaut. C'est un choix produit *et* un choix de conformité (§13).

---

## 5. Améliorations proposées

Chaque proposition est numérotée pour pouvoir être acceptée ou refusée individuellement. Celles marquées **[À VALIDER]** ne doivent pas être implémentées sans accord.

| # | Proposition | Justification |
|---|---|---|
| A1 | **Bouton unique contextuel** sur l'accueil : l'application connaît l'état courant et n'affiche que la ou les actions possibles. Jamais six boutons alignés. | C1. Supprime la question « sur lequel je dois appuyer ? ». |
| A2 | **Démarrer une intervention pointe implicitement l'arrivée** si le technicien n'a pas encore pointé. | Supprime le cas d'oubli le plus fréquent : partir directement sur site le matin. |
| A3 | **Annulation par « Annuler » pendant 60 s** au lieu d'une boîte de confirmation avant chaque pointage. | Un dialogue de confirmation à chaque geste double le nombre de taps. L'annulation post-action est plus rapide et plus sûre avec des gants. |
| A4 | **Clé d'idempotence côté client** sur chaque action de pointage (UUID généré par le téléphone). | Un double-tap avec des gants, ou un renvoi de la file hors ligne, ne doit jamais créer deux pointages. |
| A5 | **« J'ai oublié de pointer »** : saisie manuelle d'une heure passée, enregistrée avec l'origine `MANUEL` et visible comme telle par l'admin. | Sans cette porte de sortie, les gens contournent l'outil. |
| A6 | **Chips de compte rendu** : 8 à 12 libellés fréquents proposés en un tap (« Recharge fluide », « Remplacement compresseur », « Contrôle d'étanchéité », « Dégivrage », « Devis à faire », « Retour prévu »…), cumulables, plus un champ libre optionnel. | Taper du texte au clavier est le point de friction n°1 pour ce public. Le champ libre reste disponible, la dictée vocale native du clavier aussi. |
| A7 | **Rappel de fin de journée** : si un poste est encore ouvert à 20h00, notification / email au technicien. | Évite les postes de 14 heures à corriger le vendredi. |
| A8 | **Détection des écarts** : si la somme des interventions d'une journée s'écarte de plus de 30 min du temps de présence, l'écran « Ma semaine » l'indique en clair, sans bloquer. | Le technicien corrige lui-même avant le vendredi, l'admin n'a plus à courir après. |
| A9 | **Rapport hebdomadaire en pièces jointes** : email HTML lisible sur téléphone + XLSX joint. | Le XLSX est manipulable pour la paie ; le HTML est lisible immédiatement. |
| A10 | **Prévisualisation admin + bouton « Envoyer maintenant »** et « Renvoyer ». | Filet de sécurité si le cron échoue. Indispensable vu la contrainte Vercel Cron. |
| A11 | **Verrouillage de la semaine après envoi**, déverrouillable par l'admin. | Sans cela, le rapport envoyé et la base divergent silencieusement. |
| A12 | **[À VALIDER]** Géolocalisation au moment du pointage d'arrivée, désactivable. | Utile contre le badgeage à distance, mais alourdit l'analyse RGPD et dégrade la relation de confiance. **Recommandation : ne pas l'inclure en v1.** |
| A13 | **[À VALIDER]** Trajet retour distinct du trajet aller (champ séparé, pré-rempli avec la valeur aller). | Vous avez posé l'hypothèse « retour à l'atelier après chaque intervention ». Un champ unique doublé est plus simple ; deux champs sont plus justes quand on enchaîne deux clients. |

---

## 6. Modèle de données

Principe : **des intervalles, pas un journal d'événements.** Un poste a une heure de début et une heure de fin, une pause aussi, une intervention aussi. C'est ce qui rend l'édition triviale, et l'édition est une exigence explicite.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  TECHNICIEN
  ADMIN
}

enum PauseType {
  DEJEUNER
  COURTE
}

enum Origine {
  APP        // horodatage serveur au moment du tap
  MANUEL     // saisi après coup par le technicien
  CORRECTION // modifié par un admin
}

enum TypeIntervention {
  CLIENT
  ATELIER
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  role          Role     @default(TECHNICIEN)
  actif         Boolean  @default(true)
  createdAt     DateTime @default(now())

  postes        Poste[]
  interventions Intervention[]
  clientsCrees  Client[]       @relation("ClientCreePar")

  // Champs Better Auth (sessions, comptes) : voir la migration générée par Better Auth
}

model Client {
  id            String   @id @default(cuid())
  nom           String
  nomNormalise  String   @unique  // minuscules, sans accents, espaces normalisés
  actif         Boolean  @default(true)
  createdAt     DateTime @default(now())
  creeParId     String?
  creePar       User?    @relation("ClientCreePar", fields: [creeParId], references: [id])

  interventions Intervention[]

  @@index([actif, nom])
}

model Poste {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])

  debutAt       DateTime
  finAt         DateTime?

  origineDebut  Origine   @default(APP)
  origineFin    Origine?

  cleClient     String?   @unique   // idempotence hors ligne
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  pauses        Pause[]

  @@index([userId, debutAt])
}

model Pause {
  id            String    @id @default(cuid())
  posteId       String
  poste         Poste     @relation(fields: [posteId], references: [id], onDelete: Cascade)

  type          PauseType
  debutAt       DateTime
  finAt         DateTime?

  origineDebut  Origine   @default(APP)
  origineFin    Origine?

  cleClient     String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([posteId, debutAt])
}

model Intervention {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id])

  type            TypeIntervention
  clientId        String?          // null si type = ATELIER
  client          Client?          @relation(fields: [clientId], references: [id])

  debutAt         DateTime
  finAt           DateTime?

  trajetMinutes   Int              @default(0)  // aller ; compté deux fois (cf. A13)
  compteRendu     String?

  origine         Origine          @default(APP)
  cleClient       String?          @unique
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([userId, debutAt])
  @@index([clientId, debutAt])
}

model Modification {
  id          String   @id @default(cuid())
  entite      String   // "Poste" | "Pause" | "Intervention"
  entiteId    String
  champ       String
  ancienne    String?
  nouvelle    String?
  parUserId   String
  at          DateTime @default(now())
  motif       String?

  @@index([entite, entiteId])
}

model RapportHebdo {
  id          String    @id @default(cuid())
  semaineIso  String    @unique   // "2026-W36"
  envoyeAt    DateTime?
  destinataires String[]
  statut      String              // "EN_ATTENTE" | "ENVOYE" | "ECHEC"
  erreur      String?
  verrouillee Boolean   @default(false)
}
```

**Contrainte applicative (pas en base) :** un seul `Poste` ouvert (`finAt == null`) par utilisateur, une seule `Pause` ouverte par poste, une seule `Intervention` ouverte par utilisateur. À vérifier en transaction dans les Server Actions.

**Fuseau horaire :** tout est stocké en UTC. Toute conversion en heure locale se fait avec `date-fns-tz` sur `Europe/Paris`. La notion de « journée » est définie côté serveur en heure de Paris, jamais par le téléphone.

---

## 7. Règles de calcul

```
durée_poste          = finAt − debutAt
durée_pauses         = Σ (pause.finAt − pause.debutAt)     // déjeuner inclus
heures_travaillées   = durée_poste − durée_pauses

durée_intervention   = finAt − debutAt
temps_total_interv.  = durée_intervention + (2 × trajetMinutes)

heures_semaine       = Σ heures_travaillées des jours de la semaine
heures_par_client    = Σ temps_total_intervention groupé par client
temps_non_affecté    = heures_travaillées − Σ temps_total_intervention (par jour)
```

Arrondi : aucun. Les durées sont stockées à la minute et affichées en `h:mm`. Si une règle d'arrondi paie existe, elle sera appliquée au niveau du rapport, pas des données brutes.

Un poste sans `finAt` en fin de journée est affiché comme « en cours » et exclu des totaux, avec une alerte.

---

## 8. Architecture des écrans

### 8.1 Navigation

Barre d'onglets fixe en bas, **3 onglets** pour le technicien :

```
┌──────────────┬──────────────┬──────────────┐
│   Journée    │ Interventions│   Ma semaine │
└──────────────┴──────────────┴──────────────┘
```

L'admin voit un 4ᵉ onglet **Équipe**. Les réglages et la déconnexion sont dans l'en-tête, pas dans la barre.

Chaque onglet : icône pleine 28 px + libellé 12 px, hauteur 64 px + `env(safe-area-inset-bottom)`. Libellés toujours visibles — une icône seule n'est pas comprise par ce public.

### 8.2 Arborescence des routes

```
/login                          Connexion
/                               Journée (écran principal)
/intervention/nouvelle          Démarrage : client + trajet
/intervention/[id]              Détail / édition
/intervention/[id]/fin          Compte rendu de fin
/interventions                  Liste (aujourd'hui, puis historique)
/semaine                        Récapitulatif personnel
/oubli                          Saisie manuelle d'un pointage passé
/reglages                       Profil, déconnexion, version

/equipe                         [ADMIN] Vue semaine, tous techniciens
/equipe/[userId]/[semaineIso]   [ADMIN] Fiche hebdo d'un technicien
/equipe/rapport/[semaineIso]    [ADMIN] Prévisualisation + envoi
/equipe/clients                 [ADMIN] Fusion / renommage / désactivation
/equipe/utilisateurs            [ADMIN] Création de comptes
```

### 8.3 Écran par écran

---

#### `/login` — Connexion

Email + mot de passe. Comptes créés par l'admin, **aucune inscription libre**. Case « Rester connecté » cochée par défaut, session longue (30 jours) : personne ne veut retaper un mot de passe chaque matin avec des gants.

Un seul champ visible à la fois n'est pas nécessaire ici, mais les deux champs font 56 px de haut, le clavier est en `inputMode="email"`, et le bouton fait toute la largeur.

Lien « Mot de passe oublié » → email de réinitialisation via Resend.

---

#### `/` — Journée *(écran principal, 90 % de l'usage)*

C'est une machine à états. Le haut de l'écran est un **bandeau de statut en couleur pleine** qui répond à « où j'en suis ». Le bas est le **bouton d'action** dans la zone du pouce.

```
┌─────────────────────────────────┐
│  Mercredi 2 septembre           │  ← en-tête discret
├─────────────────────────────────┤
│                                 │
│                                 │
│        EN INTERVENTION          │  ← bandeau, couleur = état
│         Boucherie Martin        │
│           1 h 42                │  ← chrono, chiffres tabulaires, 44 px
│                                 │
├─────────────────────────────────┤
│  Arrivé 07:52 · Pause 32 min    │  ← résumé de la journée, 1 ligne
├─────────────────────────────────┤
│                                 │
│   ┌───────────────────────────┐ │
│   │  TERMINER L'INTERVENTION  │ │  ← 96 px de haut
│   └───────────────────────────┘ │
│   ┌───────────────────────────┐ │
│   │        Faire une pause    │ │  ← action secondaire, 64 px
│   └───────────────────────────┘ │
├─────────────────────────────────┤
│  Journée │ Interventions │ Sem. │
└─────────────────────────────────┘
```

**Table de la machine à états :**

| État | Bandeau | Action principale | Actions secondaires |
|---|---|---|---|
| Hors poste | Gris — « Pas encore arrivé » | **JE SUIS ARRIVÉ** | Démarrer une intervention · J'ai oublié de pointer |
| Au travail | Vert — « Au travail » + heure d'arrivée | **DÉMARRER UNE INTERVENTION** | Pause déjeuner · Faire une pause · Fin de journée |
| En pause déjeuner | Ambre — « Pause déjeuner » + chrono | **REPRENDRE LE TRAVAIL** | — |
| En pause | Ambre — « En pause » + chrono | **REPRENDRE LE TRAVAIL** | — |
| En intervention | Cuivre — nom du client + chrono | **TERMINER L'INTERVENTION** | Faire une pause |
| Journée terminée | Bleu foncé — total du jour | **REPRENDRE LE TRAVAIL** | Voir ma journée |

Règles :
- Une seule action principale, jamais deux boutons de même poids.
- « Fin de journée » n'apparaît que si aucune intervention n'est en cours. Si le technicien tente quand même, on lui propose de clôturer l'intervention d'abord, en un tap.
- Après chaque pointage : le bandeau change de couleur **immédiatement** (mise à jour optimiste) et un bandeau « Arrivée enregistrée à 07:52 · Annuler » reste 60 s en bas.
- Chrono mis à jour côté client à partir d'un horodatage serveur, pas de `Date.now()` local pour la valeur de référence.

---

#### `/intervention/nouvelle` — Démarrage

Trois étapes sur **un seul écran défilant**, pas un assistant multi-pages.

```
┌─────────────────────────────────┐
│ ←  Nouvelle intervention        │
├─────────────────────────────────┤
│  Chez qui ?                     │
│  ┌───────────────────────────┐  │
│  │ 🔍 Chercher un client...  │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  🔧  ATELIER              │  │  ← toujours en premier, pleine largeur
│  └───────────────────────────┘  │
│  Récents                        │
│  · Boucherie Martin             │  ← lignes de 56 px
│  · Intermarché Nord             │
│  · SCI Delaunay                 │
│  ─────────────────────────────  │
│  + Ajouter « Boul » comme       │  ← apparaît dès la saisie
│    nouveau client               │
├─────────────────────────────────┤
│  Temps de trajet aller          │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐ │
│  │ 5  ││ 10 ││ 15 ││ 20 ││ 30 │ │  ← presets, 64 px
│  └────┘└────┘└────┘└────┘└────┘ │
│  ┌───────────────────────────┐  │
│  │  Autre : ___ min          │  │  ← pavé numérique
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│   ┌───────────────────────────┐ │
│   │       DÉMARRER            │ │
│   └───────────────────────────┘ │
└─────────────────────────────────┘
```

Détails :
- **Atelier est un bouton, pas une entrée de la liste.** C'est le cas le plus fréquent après les gros clients et il ne doit jamais se chercher.
- Recherche client : insensible à la casse et aux accents, correspondance sur sous-chaîne, tri par fréquence d'usage récent du technicien.
- Création d'un client : uniquement le nom. Pas d'adresse, pas de téléphone. Confirmation par un simple tap, pas de formulaire.
- Trajet : presets en gros boutons + saisie libre. Le champ accepte 0.
- Le bouton **DÉMARRER** est désactivé tant que le client (ou Atelier) n'est pas choisi ; le trajet a une valeur par défaut de 0.

---

#### `/intervention/[id]/fin` — Compte rendu

```
┌─────────────────────────────────┐
│  Boucherie Martin · 1 h 42      │
├─────────────────────────────────┤
│  Qu'est-ce que vous avez fait ? │
│                                 │
│  ┌─────────┐ ┌────────────────┐ │
│  │Recharge │ │ Remplacement   │ │  ← chips multi-sélection
│  │ fluide  │ │  compresseur   │ │
│  └─────────┘ └────────────────┘ │
│  ┌─────────┐ ┌────────────────┐ │
│  │Étanchéité│ │  Dégivrage    │ │
│  └─────────┘ └────────────────┘ │
│  ┌─────────┐ ┌────────────────┐ │
│  │ Devis   │ │ Retour prévu   │ │
│  └─────────┘ └────────────────┘ │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Ajouter un détail          │  │  ← textarea, optionnel
│  │ (dictée possible 🎤)       │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│   ┌───────────────────────────┐ │
│   │      ENREGISTRER          │ │
│   └───────────────────────────┘ │
└─────────────────────────────────┘
```

- L'intervention est **déjà arrêtée** quand cet écran s'affiche (l'horodatage de fin est pris au tap précédent). Le compte rendu ne doit jamais retarder l'arrêt du chrono.
- Aucun champ obligatoire. Si le technicien quitte l'écran, l'intervention reste enregistrée sans compte rendu et apparaît en « À compléter » dans `/interventions` et `/semaine`.
- Les chips sélectionnées sont concaténées dans `compteRendu` (texte lisible, séparé par des virgules), suivies du texte libre. Pas de table de tags en v1 : on garde le champ texte simple pour le rapport.

---

#### `/interventions` — Liste et historique

Liste par jour, jour courant déplié, jours précédents repliés. Chaque ligne :

```
┌─────────────────────────────────┐
│ 08:15 → 09:57   Boucherie Martin│
│ 1 h 42 + 30 min trajet = 2 h 12 │
│ Recharge fluide, contrôle…      │
└─────────────────────────────────┘
```

Tap → `/intervention/[id]`. Badge « À compléter » si le compte rendu est vide. Pas de swipe pour supprimer : trop risqué avec des gants.

---

#### `/intervention/[id]` — Détail et édition

Toutes les valeurs sont éditables : heure de début, heure de fin, trajet, client, compte rendu. Chaque champ s'ouvre dans une feuille en bas d'écran (bottom sheet) avec le contrôle adapté :

- heures → sélecteur d'heure natif, gros
- trajet → mêmes presets que le démarrage
- client → même recherche que le démarrage
- compte rendu → mêmes chips

Toute modification écrit une ligne dans `Modification`. Un bandeau « Modifié le … » s'affiche sous le titre. Suppression possible via un bouton discret en bas, avec confirmation explicite (c'est la seule action destructive de l'application).

Si la semaine est verrouillée (rapport envoyé) : les champs sont en lecture seule et un message explique qu'il faut demander à l'administrateur.

---

#### `/oubli` — Rattrapage

Un écran, trois choix : « Je suis arrivé à… », « Je suis parti à… », « J'ai fait une pause de … à … ». Sélecteur d'heure, puis enregistrement avec `origine = MANUEL`. Impossible de saisir une heure future ou antérieure de plus de 7 jours.

---

#### `/semaine` — Récapitulatif personnel

Sélecteur de semaine en haut (‹ Semaine 36 ›). Puis, par jour :

```
┌─────────────────────────────────┐
│ LUNDI 31 AOÛT           7 h 45  │
│ 07:52 → 17:05  ·  pauses 1 h 28 │
│ Boucherie Martin        2 h 12  │
│ Atelier                 3 h 30  │
│ Intermarché Nord        2 h 03  │
│ ⚠ 15 min non affectées          │
└─────────────────────────────────┘
```

Total de la semaine en bas, en gros. Les lignes d'écart (A8) sont cliquables et mènent au jour concerné.

---

#### `/equipe` — [ADMIN] Vue semaine

Tableau condensé : une ligne par technicien, une colonne par jour, total à droite. Cellule vide = pas de pointage. Cellule ambre = poste non clôturé ou écart > 30 min. Tap sur une cellule → fiche du jour.

Bouton en haut : « Prévisualiser le rapport de la semaine ».

---

#### `/equipe/rapport/[semaineIso]` — [ADMIN] Prévisualisation

Rendu exact de l'email, avec les destinataires, la date d'envoi prévue, et deux boutons : **Envoyer maintenant** et **Renvoyer**. Si le rapport a déjà été envoyé, un bouton **Déverrouiller la semaine** est disponible.

---

#### `/equipe/clients` — [ADMIN] Nettoyage

La création libre de clients par les techniciens produit des doublons (« Martin », « Boucherie Martin », « bouch martin »). Cet écran permet de **fusionner** deux clients (réaffecte les interventions, désactive le doublon), de renommer et de désactiver. Ce n'est pas optionnel : sans lui, le rapport devient illisible en trois mois.

---

## 9. Direction visuelle

### 9.1 Intention

L'univers du métier est celui du **froid, du cuivre et de l'acier** : tuyauterie brasée, panneaux d'isolation, manomètres. La direction visuelle s'y accroche sans faire de folklore : fond clair et froid, encre bleu-nuit, et une seule couleur chaude — le cuivre — réservée à l'état « en intervention ». La couleur n'est pas décorative : **chaque couleur correspond à un état, et un seul**. C'est le mécanisme d'apprentissage principal pour un utilisateur qui ne lit pas les libellés.

Fond clair et non sombre : la lisibilité au soleil sur un toit dépend de la luminance du fond, et un écran majoritairement blanc à pleine luminosité reste plus lisible qu'un fond sombre.

### 9.2 Jetons

```css
:root {
  /* Base */
  --fond:          #F2F5F7;  /* blanc givre */
  --surface:       #FFFFFF;
  --trait:         #D3DDE3;
  --encre:         #10202B;  /* bleu-nuit, encre principale */
  --encre-douce:   #4A6270;  /* texte secondaire */

  /* États — une couleur = un état */
  --acier:         #0B5FA5;  /* action primaire, journée terminée */
  --vert:          #0E6B45;  /* au travail */
  --ambre:         #8A5A12;  /* en pause */
  --cuivre:        #9A4B1F;  /* en intervention */
  --gris-etat:     #5A6E7A;  /* pas encore arrivé */
  --rouge:         #A32B24;  /* erreur, suppression */
}
```

Tous les couples texte/fond utilisés passent AA (≥ 4,5:1) ; les textes de bandeau, en grande taille, dépassent largement.

### 9.3 Typographie

**Une seule famille : IBM Plex Sans.** Dessinée pour des contextes techniques, grande hauteur d'x, chiffres tabulaires excellents, glyphes distincts (le 1, le l et le I ne se confondent pas — ce qui compte quand on lit `11:10`). Alternative si le rendu ne convient pas : Archivo.

Échelle :

| Rôle | Taille / graisse | Notes |
|---|---|---|
| Chrono, total du jour | 44 px / 600 | `font-variant-numeric: tabular-nums` |
| Libellé d'état (bandeau) | 28 px / 600 | |
| Titre d'écran | 22 px / 600 | |
| Corps, libellés de boutons | 18 px / 500 | Plancher absolu du corps de texte |
| Secondaire | 15 px / 400 | `--encre-douce` |
| Onglets de navigation | 12 px / 500 | |

Rien en dessous de 15 px. Casse phrase partout ; **pas de libellés en capitales**, sauf le texte des deux boutons d'action principaux (arrivée / départ), où la casse haute sert d'ancre visuelle. Ligne de texte : 60–70 caractères maximum.

### 9.4 Composants et gestes

| Élément | Règle |
|---|---|
| Bouton d'action principal | 96 px de haut, pleine largeur moins 16 px de marge, rayon 12 px, texte 20 px |
| Bouton secondaire | 64 px, contour 2 px, fond transparent |
| Ligne de liste tapable | 56 px minimum |
| Espacement | Grille de 8 px, marge latérale 16 px |
| Rayons | 12 px pour les actions, 8 px pour les cartes, 0 pour les bandeaux pleine largeur |
| Ombres | Aucune. Les surfaces se distinguent par le trait et le fond. |
| Gestes | Tap uniquement. Pas de swipe, pas d'appui long, pas de glisser-déposer. |
| Retour haptique | Vibration courte (`navigator.vibrate(15)`) à chaque pointage réussi — perceptible à travers un gant. |
| Mouvement | Uniquement en réponse à une action : transition de couleur du bandeau (200 ms), apparition de la barre d'annulation. Aucune animation d'entrée de page. `prefers-reduced-motion` respecté. |

### 9.5 Écriture de l'interface

- Le bouton dit ce qui va se passer : « Je suis arrivé », pas « Pointer ». « Terminer l'intervention », pas « Valider ».
- Un mot garde le même sens partout : si le bouton dit « Démarrer », la confirmation dit « Intervention démarrée ».
- Les erreurs disent ce qui s'est passé et quoi faire : « Pas de réseau. Votre pointage est enregistré, il partira dès que le réseau revient. » — jamais « Une erreur est survenue ».
- Les écrans vides invitent à agir : « Aucune intervention aujourd'hui. Démarrez-en une quand vous arrivez sur site. »
- Tutoiement ou vouvoiement : **vouvoiement** (à confirmer, §14).

### 9.6 Pièges à éviter

Ne pas produire : cartes arrondies identiques empilées, dégradés décoratifs, libellés en capitales espacées au-dessus de chaque titre, chaînes de méta séparées par des points médians, flèches « → » ajoutées aux libellés de boutons, ombres portées grises génériques sur tout. Ce sont des réflexes par défaut, pas des décisions.

---

## 10. Hors ligne et PWA

C4 et C3 sont la partie technique la plus délicate du projet. Architecture :

1. **Manifeste PWA** + installation sur l'écran d'accueil. Icône, `display: standalone`, `theme-color` = `--acier`, `orientation: portrait`.
2. **Service worker via Serwist** (successeur maintenu de next-pwa) : cache de l'app shell, stratégie *stale-while-revalidate* pour les données de lecture.
3. **File d'attente (outbox) en IndexedDB** via `idb` : chaque action de pointage est écrite localement avec son UUID (`cleClient`), son type, ses paramètres et son horodatage local, **avant** tout appel réseau.
4. **Rejeu** : à la reconnexion (`online`) ou au démarrage du service worker, la file est vidée dans l'ordre, avec backoff exponentiel. La Background Sync API est une optimisation, pas une dépendance — son support navigateur est partiel.
5. **Horodatage** : le serveur fait foi *si* l'action arrive en ligne. Si elle a été créée hors ligne, on envoie l'horodatage local, le serveur le marque comme différé et refuse tout horodatage futur ou vieux de plus de 24 h.
6. **Idempotence** : `cleClient` en `@unique`. Un rejeu en double est un no-op côté serveur.
7. **Affichage** : un bandeau discret « Hors ligne — 2 pointages en attente » en haut de l'écran Journée. Jamais de blocage, jamais de spinner qui tourne dans le vide.

Tests obligatoires : mode hors ligne des DevTools, coupure réseau *pendant* un pointage, rejeu de la file, double soumission.

---

## 11. Rapport hebdomadaire

### 11.1 Contenu de l'email

**Objet :** `Récapitulatif semaine 36 — 31/08 au 04/09/2026`

**Partie 1 — Synthèse de l'équipe** (en tête de l'email)

| Technicien | Lun | Mar | Mer | Jeu | Ven | Total | Clients |
|---|---|---|---|---|---|---|---|
| Alexandre D. | 7 h 45 | 8 h 10 | 9 h 00 | 8 h 30 | 7 h 15 | **40 h 40** | 6 |

Puis, sous ce tableau, pour chaque technicien, la répartition des heures par client :

| Technicien | Client | Heures |
|---|---|---|
| Alexandre D. | Atelier | 12 h 30 |
| | Boucherie Martin | 9 h 45 |
| | Intermarché Nord | 8 h 00 |

**Partie 2 — Une section par technicien**

Titre : nom du technicien, total de la semaine.

Pour chaque jour travaillé :

| | Lundi 31/08 |
|---|---|
| Arrivée | 07:52 |
| Pause déjeuner | 12:05 → 13:00 (55 min) |
| Autres pauses | 10:12 → 10:24 (12 min) |
| Départ | 17:05 |
| **Heures travaillées** | **7 h 45** |

Puis le détail des interventions du jour :

| Heures | Client | Durée | Trajet (A/R) | Total | Ce qui a été fait |
|---|---|---|---|---|---|
| 08:15 → 09:57 | Boucherie Martin | 1 h 42 | 30 min | 2 h 12 | Recharge fluide, contrôle d'étanchéité |
| 10:30 → 14:00 | Atelier | 3 h 30 | — | 3 h 30 | Préparation des camions |

Les anomalies (poste non clôturé, compte rendu manquant, écart de temps) sont listées en fin de section, en clair.

### 11.2 Mise en forme de l'email

HTML de table simple, largeur fixe 600 px, styles en ligne. Pas de flexbox, pas de grid, pas de CSS externe : les clients mail (Outlook en particulier) ne les gèrent pas. Une version texte brut est jointe. Le **XLSX** (une feuille de synthèse + une feuille par technicien) est en pièce jointe, généré avec `exceljs`.

### 11.3 Déclenchement

`vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/rapport-hebdo", "schedule": "0 16 * * 5" }
  ]
}
```

La route :

1. rejette toute requête dont l'en-tête `Authorization` ne vaut pas `Bearer ${process.env.CRON_SECRET}` ;
2. calcule l'heure locale de Paris et **abandonne si l'on n'est pas vendredi entre 18h et 19h** (le cron étant en UTC, cette garde absorbe le passage heure d'été / heure d'hiver) ;
3. vérifie qu'aucun `RapportHebdo` n'existe déjà pour la semaine ISO en cours (idempotence) ;
4. agrège, génère, envoie via Resend, écrit le `RapportHebdo` et verrouille la semaine ;
5. en cas d'échec, écrit `statut = ECHEC` avec l'erreur, et notifie l'admin.

Vérifier le plan Vercel du compte : le plan Hobby limite le nombre de crons, leur fréquence et la précision du déclenchement. Si la fenêtre de garde est trop stricte pour la précision réelle du déclencheur, l'élargir à 17h–21h. Le bouton « Envoyer maintenant » de `/equipe/rapport/[semaineIso]` (A10) reste le filet de sécurité.

Resend nécessite la vérification du domaine d'envoi (SPF/DKIM) avant la mise en production.

---

## 12. Sécurité

- Better Auth avec email + mot de passe, sessions en base, cookies `httpOnly` + `secure` + `sameSite: lax`.
- **Toutes** les Server Actions revalident la session et le rôle côté serveur. Ne jamais se fier à un `userId` transmis par le client.
- Un technicien ne peut lire et écrire que ses propres `Poste`, `Pause` et `Intervention`. À vérifier dans chaque action, pas seulement dans le middleware.
- Les routes `/equipe/*` sont protégées par le middleware **et** par une vérification de rôle dans chaque action.
- Limitation de débit sur la connexion et sur les routes de pointage.
- `CRON_SECRET` sur la route de rapport.
- Aucun secret dans le code client. Variables d'environnement Vercel uniquement.

---

## 13. Conformité (à signaler au client, pas à implémenter aveuglément)

Points factuels à porter à la connaissance du client — ce ne sont pas des conseils juridiques :

- **L'obligation légale porte sur le décompte du temps de travail** (art. L3171-2 du Code du travail), pas sur le pointage en tant que tel. Le décompte doit être quotidien et hebdomadaire, ce que fait l'application.
- **Conservation** : la CNIL retient une durée de 5 ans pour les données de suivi du temps de travail. Les documents de décompte relèvent par ailleurs de délais spécifiques du Code du travail. → Prévoir une purge automatique au-delà de 5 ans, et documenter le choix.
- **Photos systématiques au pointage : déconseillées** par la CNIL sauf justification particulière. La biométrie est strictement encadrée. → Raison supplémentaire d'écarter A12 et toute reconnaissance faciale.
- **Information des salariés** obligatoire avant la mise en service ; consultation des instances représentatives du personnel le cas échéant.
- **Droits d'accès et de rectification** : l'écran `/semaine` et l'édition des interventions les couvrent de fait pour le salarié.
- Prévoir une page `/reglages` mentionnant la finalité du traitement, le responsable, la durée de conservation et le contact.

---

## 14. Points à trancher avant de coder

| # | Question | Défaut si pas de réponse |
|---|---|---|
| Q1 | Raison sociale exacte : « Froid Gerbert » ? | Placeholder `FROID_GERBERT`, centralisé dans une constante |
| Q2 | Destinataires du rapport hebdomadaire (adresses) | Variable d'environnement `RAPPORT_DESTINATAIRES` |
| Q3 | Nombre de techniciens attendus | Dimensionné pour 5–30 |
| Q4 | Le samedi et le dimanche sont-ils travaillés ? | Rapport sur 7 jours, colonnes week-end masquées si vides |
| Q5 | Le trajet retour est-il toujours égal au trajet aller (A13) ? | Champ unique, compté deux fois |
| Q6 | La pause déjeuner est-elle déduite du temps de travail ? | Oui, déduite |
| Q7 | Vouvoiement ou tutoiement dans l'interface ? | Vouvoiement |
| Q8 | Y a-t-il un besoin d'export vers un logiciel de paie précis ? | XLSX générique |
| Q9 | Les techniciens ont-ils une adresse email professionnelle ? | Oui — sinon, identifiant + code PIN à la place |
| Q10 | Géolocalisation au pointage (A12) ? | Non |

---

## 15. Découpage de la livraison

Chaque lot est déployable et démontrable. Ne pas passer au suivant tant que les critères d'acceptation ne sont pas remplis.

### Lot 0 — Fondations *(0,5 j)*
Projet Next.js 16 + TypeScript + Tailwind 4. Neon connecté via `@prisma/adapter-neon` avec `prisma.config.ts`. Better Auth branché sur Prisma. Déploiement Vercel effectif. Jetons de design (§9.2) dans le CSS global, IBM Plex Sans chargée, layout d'application avec barre d'onglets.

> **Acceptation :** l'URL de production affiche une page protégée, la connexion fonctionne, une requête Prisma passe.

### Lot 1 — Pointage *(1,5 j)*
Modèles `User`, `Poste`, `Pause`. Écran `/` complet avec sa machine à états, les six actions, le bandeau de couleur, le chrono, l'annulation 60 s, le retour haptique. Horodatage serveur. Écran `/oubli`.

> **Acceptation :** une journée complète (arrivée → déjeuner → reprise → pause → reprise → départ) est enregistrée correctement et les durées calculées sont exactes à la minute.

### Lot 2 — Interventions *(1,5 j)*
Modèles `Client`, `Intervention`. Écrans `/intervention/nouvelle`, `/intervention/[id]/fin`, `/interventions`. Recherche client insensible aux accents, création à la volée, bouton Atelier, presets de trajet, chips de compte rendu. Pointage implicite (A2).

> **Acceptation :** trois interventions consécutives, dont une à l'atelier et une chez un client créé à la volée, apparaissent avec les bons totaux.

### Lot 3 — Édition et semaine *(1 j)*
Écran `/intervention/[id]` avec édition de tous les champs en bottom sheet. Journal `Modification`. Écran `/semaine` avec détection des écarts (A8).

> **Acceptation :** modifier l'heure de fin d'une intervention de la veille met à jour le total du jour et laisse une trace dans `Modification`.

### Lot 4 — Administration et rapport *(2 j)*
Écrans `/equipe/*`. Agrégation hebdomadaire. Template email HTML + XLSX. Route cron sécurisée avec garde de fuseau horaire. Envoi manuel et renvoi. Verrouillage de semaine. Fusion de clients.

> **Acceptation :** un rapport de test envoyé sur une semaine de données réelles est lisible dans Gmail *et* Outlook, et les totaux correspondent au tableau `/equipe`.

### Lot 5 — Hors ligne *(1,5 j)*
Manifeste PWA, Serwist, outbox IndexedDB, rejeu, idempotence, bandeau d'état réseau.

> **Acceptation :** en mode avion, une journée complète de pointages et une intervention sont saisies ; à la reconnexion, tout remonte une seule fois, dans le bon ordre, avec les bons horodatages.

### Lot 6 — Finition *(1 j)*
Passe d'accessibilité (contrastes, focus visible, tailles de cible), test sur un téléphone bas de gamme réel, page de conformité, purge des données à 5 ans, journalisation des erreurs.

---

## 16. Conventions de code

- **TypeScript strict.** Aucun `any`. Types dérivés de Prisma, pas redéclarés.
- **Server Components par défaut.** `"use client"` uniquement sur les composants qui ont un état ou un gestionnaire d'événement.
- **Server Actions** pour toutes les écritures. Validation Zod en entrée de chaque action, sans exception.
- **Aucun appel `fetch` vers une API interne** depuis le client pour de la lecture : passer par les Server Components.
- **Dates** : UTC en base, `Europe/Paris` à l'affichage, via une seule fonction utilitaire `src/lib/temps.ts`. Aucune conversion de fuseau ailleurs dans le code.
- **Durées** : toujours des entiers de minutes dans le code métier. Le formatage `h:mm` est une fonction unique.
- **Nommage** : le domaine est en français (`Poste`, `Pause`, `Intervention`, `trajetMinutes`), l'infrastructure en anglais. Ne pas mélanger dans un même fichier.
- **Un fichier = une responsabilité.** Les calculs métier vivent dans `src/lib/calculs.ts` et sont testés unitairement — c'est le seul endroit qui justifie des tests en v1.
- Pas de commentaire qui paraphrase le code. Des commentaires uniquement sur les règles métier non évidentes (le doublement du trajet, la garde de fuseau du cron).

## 17. Ce qu'il ne faut pas ajouter

Aucune de ces fonctionnalités ne doit apparaître sans demande explicite : planning ou affectation d'interventions, devis, facturation, CERFA 15497, gestion des fluides frigorigènes, signature client, photos, notifications push marketing, chat d'équipe, tableau de bord avec graphiques, mode sombre, multilingue, gestion des congés, notes de frais, suivi kilométrique.

Le périmètre restreint **est** la fonctionnalité.
