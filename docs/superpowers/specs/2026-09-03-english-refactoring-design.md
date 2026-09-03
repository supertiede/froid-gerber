# English Refactoring — Design Spec

**Date:** 2026-09-03  
**Project:** froid-gerber  
**Scope:** Full codebase refactoring — English names everywhere, one function per file, types in `src/types/`

---

## 1. Goals

- All file names, function names, type names, and DB field/model names in English
- One exported function per file (no exceptions — internal helpers each get their own file too)
- All TypeScript types extracted to `src/types/` (one type per file)
- No barrel exports (`index.ts` re-exports) unless required by Next.js or a framework
- French URLs (`/journee`, `/semaine`, etc.) are preserved — they are user-facing routes
- DB column data (values) unchanged — only identifiers change
- Prisma schema renames use `@map` / `@@map` to control SQL names (non-destructive migration)

---

## 2. Directory Structure

```
src/
├── types/
│   ├── ShiftSimple.ts
│   ├── BreakSimple.ts
│   ├── InterventionSimple.ts
│   ├── InterventionData.ts
│   ├── DayData.ts
│   ├── TechnicianData.ts
│   ├── InterventionField.ts
│   └── ManualTimestampInput.ts
│
├── lib/
│   ├── time/
│   │   ├── now.ts
│   │   ├── toParis.ts
│   │   ├── startOfDayParis.ts
│   │   ├── endOfDayParis.ts
│   │   ├── formatTime.ts
│   │   ├── formatDuration.ts
│   │   ├── diffMinutes.ts
│   │   └── formatLongDate.ts
│   ├── calculations/
│   │   ├── shiftDuration.ts
│   │   ├── breaksDuration.ts
│   │   ├── workedMinutes.ts
│   │   └── interventionMinutes.ts
│   ├── report/
│   │   ├── generateReportHtml.ts
│   │   ├── sendReport.ts
│   │   └── generatePdfReport.ts
│   ├── aggregation/
│   │   ├── aggregateWeek.ts
│   │   └── getCurrentIsoWeek.ts
│   ├── auth/
│   │   └── getSession.ts
│   └── queries/
│       ├── getOpenShift.ts
│       ├── getOpenIntervention.ts
│       ├── findShiftByClientKey.ts
│       └── normalizeClientName.ts
│
├── actions/
│   ├── shift/
│   │   ├── clockIn.ts
│   │   ├── cancelClockIn.ts
│   │   ├── startBreak.ts
│   │   ├── cancelBreak.ts
│   │   ├── resumeWork.ts
│   │   ├── cancelResumeWork.ts
│   │   ├── endDay.ts
│   │   ├── cancelEndDay.ts
│   │   ├── resumeDay.ts
│   │   └── manualTimestamp.ts
│   ├── intervention/
│   │   ├── startIntervention.ts
│   │   ├── endIntervention.ts
│   │   ├── saveWorkReport.ts
│   │   ├── getInterventionList.ts
│   │   ├── updateIntervention.ts
│   │   └── deleteIntervention.ts
│   ├── client/
│   │   ├── searchClients.ts
│   │   ├── getAllClients.ts
│   │   └── createClient.ts
│   └── auth/
│       └── markPasswordChanged.ts
│
└── components/
    ├── day/           (was: journee/)
    │   ├── DayScreen.tsx
    │   ├── StatusBanner.tsx
    │   ├── CancellationBanner.tsx
    │   └── Timer.tsx
    ├── week/          (was: semaine/)
    │   └── WeekView.tsx
    ├── settings/      (was: reglages/)
    │   └── SettingsView.tsx
    ├── intervention/
    │   ├── InterventionDetail.tsx
    │   ├── WorkReportChips.tsx   (was: ChipsCompteRendu.tsx)
    │   ├── WorkReportForm.tsx    (was: CompteRenduForm.tsx)
    │   └── ClientSearchModal.tsx (was: RechercheClientModal.tsx)
    └── layout/
        ├── BottomNav.tsx
        └── OfflineBanner.tsx    (was: BandeauHorsLigne.tsx)
```

---

## 3. Prisma Schema Changes

### Model renames (with `@@map` to keep SQL table names stable)

| Old model | New model | SQL table |
|---|---|---|
| `Poste` | `Shift` | `shift` (via `@@map`) |
| `Pause` | `Break` | `work_break` (via `@@map` — `break` is a SQL reserved word) |
| `Modification` | `AuditLog` | `audit_log` (via `@@map`) |
| `RapportHebdo` | `WeeklyReport` | `weekly_report` (via `@@map`) |
| `Intervention` | `Intervention` | unchanged |
| `Client` | `Client` | unchanged |
| `user`, `session`, `account`, `verification` | unchanged (Better Auth managed) |

### Enum renames

| Old | New |
|---|---|
| `PauseType` | `BreakType` |
| `DEJEUNER` | `LUNCH` |
| `COURTE` | `SHORT` |
| `Origine` | `Origin` |
| `MANUEL` | `MANUAL` |
| `TypeIntervention` | `InterventionType` |
| `ATELIER` | `WORKSHOP` |

### Field renames (selected — full list in implementation plan)

| Model | Old field | New field |
|---|---|---|
| `user` | `doitChangerMotDePasse` | `mustChangePassword` |
| `user` | `actif` | `active` |
| `Shift` | `debutAt` | `startAt` |
| `Shift` | `finAt` | `endAt` |
| `Shift` | `origineDebut` | `startOrigin` |
| `Shift` | `origineFin` | `endOrigin` |
| `Shift` | `cleClient` | `idempotencyKey` |
| `Break` | `debutAt` | `startAt` |
| `Break` | `finAt` | `endAt` |
| `Break` | `origineDebut` | `startOrigin` |
| `Break` | `origineFin` | `endOrigin` |
| `Break` | `cleClient` | `idempotencyKey` |
| `Break` | `posteId` | `shiftId` |
| `Intervention` | `debutAt` | `startAt` |
| `Intervention` | `finAt` | `endAt` |
| `Intervention` | `trajetMinutes` | `travelMinutes` |
| `Intervention` | `compteRendu` | `workReport` |
| `Intervention` | `cleClient` | `idempotencyKey` |
| `Client` | `nom` | `name` |
| `Client` | `nomNormalise` | `normalizedName` |
| `Client` | `actif` | `active` |
| `Client` | `creeParId` | `createdById` |
| `Client` | `creePar` | `createdBy` |
| `AuditLog` | `entite` | `entity` |
| `AuditLog` | `entiteId` | `entityId` |
| `AuditLog` | `champ` | `field` |
| `AuditLog` | `ancienne` | `oldValue` |
| `AuditLog` | `nouvelle` | `newValue` |
| `AuditLog` | `parUserId` | `changedByUserId` |
| `AuditLog` | `motif` | `reason` |
| `WeeklyReport` | `semaineIso` | `isoWeek` |
| `WeeklyReport` | `envoyeAt` | `sentAt` |
| `WeeklyReport` | `destinataires` | `recipients` |
| `WeeklyReport` | `statut` | `status` |
| `WeeklyReport` | `verrouillee` | `locked` |

### Migration strategy

1. Update `prisma/schema.prisma` with all renames + `@map`/`@@map` directives
2. Run `prisma migrate dev --name english-refactoring` — generates SQL `ALTER TABLE RENAME COLUMN` statements (non-destructive, no data loss)
3. Update all TypeScript files referencing old field names
4. Run `prisma generate` to regenerate the client

---

## 4. Function Name Mapping

### lib/time/
| Old | New |
|---|---|
| `maintenant()` | `now()` |
| `enParis()` | `toParis()` |
| `debutJourneeParis()` | `startOfDayParis()` |
| `finJourneeParis()` | `endOfDayParis()` |
| `formatHeure()` | `formatTime()` |
| `formatDuree()` | `formatDuration()` |
| `formatDateLongue()` | `formatLongDate()` |
| `diffMinutes()` | `diffMinutes()` (unchanged) |

### lib/calculations/
| Old | New |
|---|---|
| `dureePosteMinutes()` | `shiftDuration()` |
| `dureePausesMinutes()` | `breaksDuration()` |
| `heuresTravailleesMinutes()` | `workedMinutes()` |
| `tempsInterventionMinutes()` | `interventionMinutes()` |

### lib/aggregation/
| Old | New |
|---|---|
| `aggregerSemaine()` | `aggregateWeek()` |
| `getSemaineIsoActuelle()` | `getCurrentIsoWeek()` |

### lib/report/
| Old | New |
|---|---|
| `genererHtmlRapport()` | `generateReportHtml()` |
| `envoyerRapport()` | `sendReport()` |
| `genererPdfRapport()` | `generatePdfReport()` |

### lib/queries/ (extracted helpers)
| Old (internal) | New |
|---|---|
| `getSession()` (in each action file) | `getSession()` in `lib/auth/getSession.ts` |
| `getPosteOuvert()` | `getOpenShift()` |
| `getInterventionOuverte()` | `getOpenIntervention()` |
| `posteExisteParCleClient()` | `findShiftByClientKey()` |
| `normaliser()` | `normalizeClientName()` |

### actions/shift/
| Old | New |
|---|---|
| `arriver()` | `clockIn()` |
| `annulerArrivee()` | `cancelClockIn()` |
| `demarrerPause()` | `startBreak()` |
| `annulerPause()` | `cancelBreak()` |
| `reprendreTravail()` | `resumeWork()` |
| `annulerRepriseTravail()` | `cancelResumeWork()` |
| `terminerJournee()` | `endDay()` |
| `annulerFinJournee()` | `cancelEndDay()` |
| `reprendreJournee()` | `resumeDay()` |
| `pointageManuel()` | `manualTimestamp()` |

### actions/intervention/
| Old | New |
|---|---|
| `demarrerIntervention()` | `startIntervention()` |
| `terminerIntervention()` | `endIntervention()` |
| `enregistrerCompteRendu()` | `saveWorkReport()` |
| `getInterventions()` | `getInterventionList()` |
| `modifierIntervention()` | `updateIntervention()` |
| `supprimerIntervention()` | `deleteIntervention()` |

### actions/client/
| Old | New |
|---|---|
| `chercherClients()` | `searchClients()` |
| `getTousLesClients()` | `getAllClients()` |
| `creerClient()` | `createClient()` |

### actions/auth/
| Old | New |
|---|---|
| `marquerMotDePasseChange()` | `markPasswordChanged()` |

---

## 5. Component Name Mapping

| Old file | New file | Old function | New function |
|---|---|---|---|
| `journee/EcranJournee.tsx` | `day/DayScreen.tsx` | `EcranJournee` | `DayScreen` |
| `journee/BandeauEtat.tsx` | `day/StatusBanner.tsx` | `BandeauEtat` | `StatusBanner` |
| `journee/BandeauAnnulation.tsx` | `day/CancellationBanner.tsx` | `BandeauAnnulation` | `CancellationBanner` |
| `journee/Chrono.tsx` | `day/Timer.tsx` | `Chrono` | `Timer` |
| `layout/BandeauHorsLigne.tsx` | `layout/OfflineBanner.tsx` | `BandeauHorsLigne` | `OfflineBanner` |
| `intervention/ChipsCompteRendu.tsx` | `intervention/WorkReportChips.tsx` | `ChipsCompteRendu` | `WorkReportChips` |
| `intervention/CompteRenduForm.tsx` | `intervention/WorkReportForm.tsx` | `CompteRenduForm` | `WorkReportForm` |
| `intervention/RechercheClientModal.tsx` | `intervention/ClientSearchModal.tsx` | `RechercheClientModal` | `ClientSearchModal` |
| `reglages/ReglagesView.tsx` | `settings/SettingsView.tsx` | `ReglagesView` | `SettingsView` |
| `semaine/SemaineView.tsx` | `week/WeekView.tsx` | `SemaineView` | `WeekView` |

---

## 6. Rules Summary

- **One function per file** — applies to all functions: exported, internal, helpers, React components. No exceptions.
- **No barrel exports** — direct imports only. e.g. `import { clockIn } from '@/actions/shift/clockIn'`
- **No French identifiers** in TypeScript code — DB column values (strings stored in DB) are unaffected
- **French URLs preserved** — Next.js route directories (`journee/`, `semaine/`, etc.) keep French names
- **Better Auth models** (`user`, `session`, `account`, `verification`) — field renames follow the same rules; model names stay lowercase as required by Better Auth
- **`'use server'`** directive — every action file keeps this directive at the top

---

## 7. Additional Files to Rename

- `scripts/creer-utilisateur.ts` → `scripts/createUser.ts` (internal script name + function names in English)
- `src/app/api/test-rapport/route.ts` → `src/app/api/test-report/route.ts` (API route, not user-facing URL)
- `src/lib/auth.ts` — keeps its name (Better Auth config file); internal variable names stay as required by the library
- `src/lib/prisma.ts` — keeps its name (infrastructure singleton)
- `src/middleware.ts` → `src/proxy.ts` already renamed; internal function stays as `proxy`

---

## 8. Files Not Touched

- `prisma/migrations/` — existing migrations untouched, new migration added
- `public/` — static assets
- `.env.local`, `vercel.json`, `package.json` — configuration unchanged
- `next.config.ts`, `tailwind.config.ts` — unchanged
- `src/app/**/page.tsx`, `src/app/**/layout.tsx` — route files keep their directory names; internal code (imports, function names) updated
