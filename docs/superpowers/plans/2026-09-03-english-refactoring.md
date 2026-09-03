# English Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all TypeScript identifiers, file names, function names, and Prisma model/field names to English; split every function into its own file; extract all types to `src/types/`.

**Architecture:** Clean rename — no `@map`/`@@map` tricks. Rewrite Prisma schema with fully English names, run `prisma migrate reset` (data loss accepted), regenerate client, update all TypeScript code, delete old files last. Better Auth models (`user`, `session`, `account`, `verification`) keep lowercase model names as required by the library, but their custom fields are renamed to English.

**Tech Stack:** Next.js 16, Prisma 7, TypeScript strict, Better Auth

---

## Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Replace schema.prisma with clean English schema (no @map)**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// Better Auth core models — model names must stay lowercase for the adapter
model user {
  id                 String    @id
  name               String
  email              String?
  emailVerified      Boolean   @default(false)
  image              String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  username           String?   @unique
  displayUsername    String?
  mustChangePassword Boolean   @default(true)
  active             Boolean   @default(true)
  sessions           session[]
  accounts           account[]

  shifts         Shift[]
  interventions  Intervention[]
  clientsCreated Client[]       @relation("ClientCreatedBy")

  @@map("user")
}

model session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      user     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model account {
  id                    String    @id
  issuer                String
  accountId             String
  providerId            String
  userId                String
  user                  user      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@unique([issuer, accountId])
  @@map("account")
}

model verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("verification")
}

enum BreakType {
  LUNCH
  SHORT
}

enum Origin {
  APP
  MANUAL
}

enum InterventionType {
  CLIENT
  WORKSHOP
}

model Client {
  id             String   @id @default(cuid())
  name           String
  normalizedName String   @unique
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  createdById    String?
  createdBy      user?    @relation("ClientCreatedBy", fields: [createdById], references: [id])

  interventions Intervention[]

  @@index([active, name])
}

model Shift {
  id             String    @id @default(cuid())
  userId         String
  user           user      @relation(fields: [userId], references: [id])
  startAt        DateTime
  endAt          DateTime?
  startOrigin    Origin    @default(APP)
  endOrigin      Origin?
  idempotencyKey String?   @unique
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  breaks         Break[]

  @@index([userId, startAt])
}

model Break {
  id             String    @id @default(cuid())
  shiftId        String
  shift          Shift     @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  type           BreakType
  startAt        DateTime
  endAt          DateTime?
  startOrigin    Origin    @default(APP)
  endOrigin      Origin?
  idempotencyKey String?   @unique
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([shiftId, startAt])
}

model Intervention {
  id             String           @id @default(cuid())
  userId         String
  user           user             @relation(fields: [userId], references: [id])
  type           InterventionType
  clientId       String?
  client         Client?          @relation(fields: [clientId], references: [id])
  startAt        DateTime
  endAt          DateTime?
  travelMinutes  Int              @default(0)
  workReport     String?
  origin         Origin           @default(APP)
  idempotencyKey String?          @unique
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([userId, startAt])
  @@index([clientId, startAt])
}

model AuditLog {
  id              String   @id @default(cuid())
  entity          String
  entityId        String
  field           String
  oldValue        String?
  newValue        String?
  changedByUserId String
  at              DateTime @default(now())
  reason          String?

  @@index([entity, entityId])
}

model WeeklyReport {
  id         String    @id @default(cuid())
  isoWeek    String    @unique
  sentAt     DateTime?
  recipients String[]
  status     String
  error      String?
  locked     Boolean   @default(false)
}
```

- [ ] **Step 2: Update Better Auth additionalFields in `src/lib/auth.ts`**

Replace the `user.additionalFields` block:

```ts
user: {
  additionalFields: {
    mustChangePassword: {
      type: 'boolean',
      required: false,
      defaultValue: true,
      input: false,
    },
    active: {
      type: 'boolean',
      required: false,
      defaultValue: true,
      input: false,
    },
  },
},
```

- [ ] **Step 3: Reset DB and run clean migration**

```bash
npx prisma migrate reset --force
```

Expected: database dropped, recreated, and all tables created with English names. Then:

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/lib/auth.ts
git commit -m "refactor: rename Prisma models/fields/enums to English with @map"
```

---

## Task 2: Create src/types/ files

**Files:** Create 8 files in `src/types/`

- [ ] **Step 1: Create `src/types/ShiftSimple.ts`**

```ts
export type ShiftSimple = { startAt: Date; endAt: Date | null }
```

- [ ] **Step 2: Create `src/types/BreakSimple.ts`**

```ts
export type BreakSimple = { startAt: Date; endAt: Date | null }
```

- [ ] **Step 3: Create `src/types/InterventionSimple.ts`**

```ts
export type InterventionSimple = { startAt: Date; endAt: Date | null; travelMinutes: number }
```

- [ ] **Step 4: Create `src/types/InterventionData.ts`**

```ts
export type InterventionData = {
  startTime: string
  endTime: string | null
  clientName: string
  durationMinutes: number | null
  travelMinutes: number
  totalMinutes: number | null
  workReport: string | null
}
```

- [ ] **Step 5: Create `src/types/DayData.ts`**

```ts
import type { InterventionData } from './InterventionData'

export type DayData = {
  dayLabel: string
  arrival: string | null
  departure: string | null
  lunchBreakLabel: string | null
  otherBreaks: string[]
  workedMinutes: number
  interventions: InterventionData[]
  anomalies: string[]
}
```

- [ ] **Step 6: Create `src/types/TechnicianData.ts`**

```ts
import type { DayData } from './DayData'

export type TechnicianData = {
  userId: string
  name: string
  weekTotalMinutes: number
  daysData: DayData[]
  hoursByClient: { clientName: string; totalMinutes: number }[]
  anomalies: string[]
}
```

- [ ] **Step 7: Create `src/types/InterventionField.ts`**

```ts
export type InterventionField = 'startAt' | 'endAt' | 'travelMinutes' | 'clientId' | 'workReport' | 'type'
```

- [ ] **Step 8: Create `src/types/ManualTimestampInput.ts`**

```ts
export type ManualTimestampInput = {
  type: 'ARRIVAL' | 'DEPARTURE' | 'BREAK'
  startTime: string
  endTime?: string
  breakType?: 'LUNCH' | 'SHORT'
  idempotencyKey: string
}
```

- [ ] **Step 9: Commit**

```bash
git add src/types/
git commit -m "refactor: add src/types/ with English type names"
```

---

## Task 3: Create src/lib/time/ files

**Files:** Create 8 files in `src/lib/time/`

- [ ] **Step 1: Create `src/lib/time/now.ts`**

```ts
export function now(): Date {
  return new Date()
}
```

- [ ] **Step 2: Create `src/lib/time/toParis.ts`**

```ts
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function toParis(date: Date): Date {
  return toZonedTime(date, TZ)
}
```

- [ ] **Step 3: Create `src/lib/time/startOfDayParis.ts`**

```ts
import { startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function startOfDayParis(date: Date): Date {
  return fromZonedTime(startOfDay(toZonedTime(date, TZ)), TZ)
}
```

- [ ] **Step 4: Create `src/lib/time/endOfDayParis.ts`**

```ts
import { endOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function endOfDayParis(date: Date): Date {
  return fromZonedTime(endOfDay(toZonedTime(date, TZ)), TZ)
}
```

- [ ] **Step 5: Create `src/lib/time/formatTime.ts`**

```ts
import { toZonedTime, format } from 'date-fns-tz'

const TZ = 'Europe/Paris'

export function formatTime(date: Date): string {
  return format(toZonedTime(date, TZ), 'HH:mm', { timeZone: TZ })
}
```

- [ ] **Step 6: Create `src/lib/time/formatDuration.ts`**

```ts
export function formatDuration(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  return `${h} h ${m.toString().padStart(2, '0')}`
}
```

- [ ] **Step 7: Create `src/lib/time/diffMinutes.ts`**

```ts
export function diffMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 60000)
}
```

- [ ] **Step 8: Create `src/lib/time/formatLongDate.ts`**

```ts
import { toZonedTime, format } from 'date-fns-tz'
import { fr } from 'date-fns/locale'

const TZ = 'Europe/Paris'

export function formatLongDate(date: Date): string {
  return format(toZonedTime(date, TZ), 'EEEE d MMMM', { timeZone: TZ, locale: fr })
}
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/time/
git commit -m "refactor: split lib/temps.ts into src/lib/time/ (English names)"
```

---

## Task 4: Create src/lib/calculations/ files

**Files:** Create 4 files in `src/lib/calculations/`

- [ ] **Step 1: Create `src/lib/calculations/shiftDuration.ts`**

```ts
import type { ShiftSimple } from '@/types/ShiftSimple'
import { diffMinutes } from '@/lib/time/diffMinutes'

export function shiftDuration(shift: ShiftSimple): number {
  if (!shift.endAt) return 0
  return diffMinutes(shift.startAt, shift.endAt)
}
```

- [ ] **Step 2: Create `src/lib/calculations/breaksDuration.ts`**

```ts
import type { BreakSimple } from '@/types/BreakSimple'
import { diffMinutes } from '@/lib/time/diffMinutes'

export function breaksDuration(breaks: BreakSimple[]): number {
  return breaks.reduce((acc, b) => {
    if (!b.endAt) return acc
    return acc + diffMinutes(b.startAt, b.endAt)
  }, 0)
}
```

- [ ] **Step 3: Create `src/lib/calculations/workedMinutes.ts`**

```ts
import type { ShiftSimple } from '@/types/ShiftSimple'
import type { BreakSimple } from '@/types/BreakSimple'
import { shiftDuration } from './shiftDuration'
import { breaksDuration } from './breaksDuration'

export function workedMinutes(shift: ShiftSimple, breaks: BreakSimple[]): number {
  return shiftDuration(shift) - breaksDuration(breaks)
}
```

- [ ] **Step 4: Create `src/lib/calculations/interventionMinutes.ts`**

```ts
import type { InterventionSimple } from '@/types/InterventionSimple'
import { diffMinutes } from '@/lib/time/diffMinutes'

export function interventionMinutes(intervention: InterventionSimple): number {
  if (!intervention.endAt) return 0
  return diffMinutes(intervention.startAt, intervention.endAt) + 2 * intervention.travelMinutes
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculations/
git commit -m "refactor: split lib/calculs.ts into src/lib/calculations/ (English names)"
```

---

## Task 5: Create src/lib/queries/ and src/lib/auth/

**Files:** Create 5 files

- [ ] **Step 1: Create `src/lib/auth/getSession.ts`**

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Unauthenticated')
  return session
}
```

- [ ] **Step 2: Create `src/lib/queries/getOpenShift.ts`**

```ts
import { prisma } from '@/lib/prisma'

export async function getOpenShift(userId: string) {
  return prisma.shift.findFirst({
    where: { userId, endAt: null },
    include: { breaks: true },
  })
}
```

- [ ] **Step 3: Create `src/lib/queries/getOpenIntervention.ts`**

```ts
import { prisma } from '@/lib/prisma'

export async function getOpenIntervention(userId: string) {
  return prisma.intervention.findFirst({
    where: { userId, endAt: null },
    include: { client: true },
  })
}
```

- [ ] **Step 4: Create `src/lib/queries/findShiftByClientKey.ts`**

```ts
import { prisma } from '@/lib/prisma'

export async function findShiftByClientKey(idempotencyKey: string) {
  return prisma.shift.findUnique({ where: { idempotencyKey } })
}
```

- [ ] **Step 5: Create `src/lib/queries/normalizeClientName.ts`**

```ts
export function normalizeClientName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/ src/lib/queries/
git commit -m "refactor: extract shared query helpers and getSession to lib/"
```

---

## Task 6: Create src/lib/aggregation/ files

**Files:** Create 2 files in `src/lib/aggregation/`

- [ ] **Step 1: Create `src/lib/aggregation/getCurrentIsoWeek.ts`**

```ts
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function getCurrentIsoWeek(): string {
  const now = toZonedTime(new Date(), 'Europe/Paris')
  return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`
}
```

- [ ] **Step 2: Create `src/lib/aggregation/aggregateWeek.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { addWeeks, startOfISOWeek, endOfISOWeek, eachDayOfInterval, format } from 'date-fns'
import { toZonedTime, format as formatTZ } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import { workedMinutes } from '@/lib/calculations/workedMinutes'
import { interventionMinutes } from '@/lib/calculations/interventionMinutes'
import { formatTime } from '@/lib/time/formatTime'
import { diffMinutes } from '@/lib/time/diffMinutes'
import type { TechnicianData } from '@/types/TechnicianData'
import type { DayData } from '@/types/DayData'
import type { InterventionData } from '@/types/InterventionData'

const TZ = 'Europe/Paris'

export async function aggregateWeek(isoWeek: string): Promise<TechnicianData[]> {
  const [yearStr, weekStr] = isoWeek.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  const jan4 = new Date(year, 0, 4)
  const refDate = addWeeks(startOfISOWeek(jan4), week - 1)
  const weekStart = startOfISOWeek(refDate)
  const weekEnd = endOfISOWeek(refDate)

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })

  const results: TechnicianData[] = []

  for (const user of users) {
    const [shifts, interventions] = await Promise.all([
      prisma.shift.findMany({
        where: { userId: user.id, startAt: { gte: weekStart, lte: weekEnd } },
        include: { breaks: true },
        orderBy: { startAt: 'asc' },
      }),
      prisma.intervention.findMany({
        where: { userId: user.id, startAt: { gte: weekStart, lte: weekEnd } },
        include: { client: true },
        orderBy: { startAt: 'asc' },
      }),
    ])

    if (shifts.length === 0 && interventions.length === 0) continue

    let weekTotalMinutes = 0
    const hoursByClient = new Map<string, number>()
    const daysData: DayData[] = []

    for (const day of eachDayOfInterval({ start: weekStart, end: weekEnd })) {
      const dayStr = format(day, 'yyyy-MM-dd')

      const shift = shifts.find(s => format(toZonedTime(s.startAt, TZ), 'yyyy-MM-dd') === dayStr) ?? null
      const dayInterventions = interventions.filter(i => format(toZonedTime(i.startAt, TZ), 'yyyy-MM-dd') === dayStr)

      if (!shift && dayInterventions.length === 0) continue

      const dayAnomalies: string[] = []

      const arrival = shift ? formatTime(shift.startAt) : null
      const departure = shift?.endAt ? formatTime(shift.endAt) : null

      if (shift && !shift.endAt) dayAnomalies.push('Shift not closed')

      const lunchBreak = shift?.breaks.find(b => b.type === 'LUNCH' && b.endAt) ?? null
      const otherBreaksList = shift?.breaks.filter(b => b.type === 'SHORT' && b.endAt) ?? []

      const lunchBreakLabel = lunchBreak?.endAt
        ? `${formatTime(lunchBreak.startAt)} → ${formatTime(lunchBreak.endAt)} (${diffMinutes(lunchBreak.startAt, lunchBreak.endAt)} min)`
        : null

      const otherBreaks = otherBreaksList.map(b =>
        b.endAt ? `${formatTime(b.startAt)} → ${formatTime(b.endAt)} (${diffMinutes(b.startAt, b.endAt)} min)` : ''
      ).filter(Boolean)

      const breaksForCalc = (shift?.breaks ?? []).map(b => ({ startAt: b.startAt, endAt: b.endAt }))
      const shiftForCalc = shift ? { startAt: shift.startAt, endAt: shift.endAt } : null
      const worked = shiftForCalc?.endAt
        ? workedMinutes(shiftForCalc as { startAt: Date; endAt: Date }, breaksForCalc as { startAt: Date; endAt: Date | null }[])
        : 0

      if (shiftForCalc?.endAt) weekTotalMinutes += worked

      const intervData: InterventionData[] = []
      let totalIntervDay = 0

      for (const interv of dayInterventions) {
        const clientName = interv.type === 'WORKSHOP' ? 'Workshop' : interv.client?.name ?? '—'
        const duration = interv.endAt ? diffMinutes(interv.startAt, interv.endAt) : null
        const total = interv.endAt
          ? interventionMinutes({ startAt: interv.startAt, endAt: interv.endAt, travelMinutes: interv.travelMinutes })
          : null

        if (!interv.endAt) dayAnomalies.push(`Intervention ${clientName} not closed`)
        if (!interv.workReport && interv.endAt) dayAnomalies.push(`Work report missing: ${clientName}`)

        if (total !== null) {
          totalIntervDay += total
          hoursByClient.set(clientName, (hoursByClient.get(clientName) ?? 0) + total)
        }

        intervData.push({
          startTime: formatTime(interv.startAt),
          endTime: interv.endAt ? formatTime(interv.endAt) : null,
          clientName,
          durationMinutes: duration,
          travelMinutes: interv.travelMinutes,
          totalMinutes: total,
          workReport: interv.workReport,
        })
      }

      if (worked > 0 && Math.abs(worked - totalIntervDay) > 30) {
        dayAnomalies.push(`Gap of ${Math.abs(worked - totalIntervDay)} min between presence and interventions`)
      }

      const dayZoned = toZonedTime(day, TZ)
      daysData.push({
        dayLabel: formatTZ(dayZoned, 'EEEE d/MM', { timeZone: TZ, locale: fr }),
        arrival,
        departure,
        lunchBreakLabel,
        otherBreaks,
        workedMinutes: worked,
        interventions: intervData,
        anomalies: dayAnomalies,
      })
    }

    results.push({
      userId: user.id,
      name: user.name,
      weekTotalMinutes,
      daysData,
      hoursByClient: [...hoursByClient.entries()]
        .map(([clientName, totalMinutes]) => ({ clientName, totalMinutes }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes),
      anomalies: [],
    })
  }

  return results
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/aggregation/
git commit -m "refactor: split aggregation.ts into src/lib/aggregation/ (English names)"
```

---

## Task 7: Create src/lib/report/ files

**Files:** Create 3 files in `src/lib/report/`

- [ ] **Step 1: Create `src/lib/report/generateReportHtml.ts`**

```ts
import type { TechnicianData } from '@/types/TechnicianData'
import { formatDuration } from '@/lib/time/formatDuration'

export function generateReportHtml(isoWeek: string, data: TechnicianData[]): string {
  const weekNum = isoWeek.split('-W')[1]

  const teamRows = data.map(tech => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3">${tech.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3;font-weight:600">${formatDuration(tech.weekTotalMinutes)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3">${tech.hoursByClient.length} clients</td>
    </tr>
  `).join('')

  const sections = data.map(tech => {
    const daysHtml = tech.daysData.map(day => {
      const intervRows = day.interventions.map(i => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.startTime}${i.endTime ? ` → ${i.endTime}` : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.clientName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.durationMinutes !== null ? formatDuration(i.durationMinutes) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.travelMinutes > 0 ? formatDuration(i.travelMinutes * 2) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;font-weight:600">${i.totalMinutes !== null ? formatDuration(i.totalMinutes) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;color:#4A6270">${i.workReport ?? ''}</td>
        </tr>
      `).join('')

      const anomaliesHtml = day.anomalies.length > 0
        ? `<p style="color:#A32B24;font-size:13px;margin:4px 0">⚠ ${day.anomalies.join(' — ')}</p>`
        : ''

      return `
        <div style="margin-bottom:24px">
          <div style="background:#F2F5F7;padding:8px 12px;border-left:4px solid #0B5FA5;margin-bottom:8px">
            <strong style="font-size:15px">${day.dayLabel}</strong>
            <span style="float:right;font-weight:700">${formatDuration(day.workedMinutes)}</span>
          </div>
          ${day.arrival ? `<p style="font-size:13px;color:#4A6270;margin:4px 0">Arrivée ${day.arrival}${day.departure ? ` — Départ ${day.departure}` : ' (poste ouvert)'}${day.lunchBreakLabel ? ` — Déjeuner ${day.lunchBreakLabel}` : ''}</p>` : ''}
          ${day.interventions.length > 0 ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">
              <thead><tr style="background:#F2F5F7">
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Heures</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Client</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Durée</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Trajet A/R</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Total</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Compte rendu</th>
              </tr></thead>
              <tbody>${intervRows}</tbody>
            </table>
          ` : '<p style="font-size:13px;color:#4A6270;margin:4px 0">Aucune intervention</p>'}
          ${anomaliesHtml}
        </div>
      `
    }).join('')

    const clientsHtml = tech.hoursByClient.map(hpc => `
      <tr>
        <td style="padding:4px 8px;font-size:13px">${hpc.clientName}</td>
        <td style="padding:4px 8px;font-size:13px;font-weight:600;text-align:right">${formatDuration(hpc.totalMinutes)}</td>
      </tr>
    `).join('')

    return `
      <div style="margin-bottom:40px;page-break-inside:avoid">
        <h2 style="font-size:18px;color:#0B5FA5;border-bottom:2px solid #0B5FA5;padding-bottom:8px">
          ${tech.name} — ${formatDuration(tech.weekTotalMinutes)}
        </h2>
        ${tech.hoursByClient.length > 0 ? `<table width="200" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px"><tbody>${clientsHtml}</tbody></table>` : ''}
        ${daysHtml}
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#10202B;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0B5FA5;color:#fff;padding:20px;border-radius:8px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">Froid Gerber</h1>
    <p style="margin:4px 0 0;opacity:0.85">Récapitulatif semaine ${weekNum}</p>
  </div>
  <h2 style="font-size:16px;color:#0B5FA5">Synthèse équipe</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px">
    <thead><tr style="background:#F2F5F7">
      <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Technicien</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Total</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Clients</th>
    </tr></thead>
    <tbody>${teamRows}</tbody>
  </table>
  ${sections}
  <p style="font-size:12px;color:#4A6270;border-top:1px solid #D3DDE3;padding-top:16px;margin-top:32px">
    Rapport généré automatiquement — Froid Gerber Pointage
  </p>
</body>
</html>`
}
```

- [ ] **Step 2: Create `src/lib/report/sendReport.ts`**

```ts
import type { TechnicianData } from '@/types/TechnicianData'
import { generateReportHtml } from './generateReportHtml'

export async function sendReport(isoWeek: string, data: TechnicianData[], pdfBuffer: Buffer): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const recipients = (process.env.RAPPORT_DESTINATAIRES ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    console.warn('[report] No recipients configured (RAPPORT_DESTINATAIRES empty)')
    return
  }

  const html = generateReportHtml(isoWeek, data)
  const weekNum = isoWeek.split('-W')[1]

  if (!apiKey) {
    console.warn('[report] RESEND_API_KEY missing — email not sent (dev mode)')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'Froid Gerber <noreply@froid-gerber.fr>',
    to: recipients,
    subject: `Récapitulatif semaine ${weekNum} — Froid Gerber`,
    html,
    attachments: [{ filename: `recap-semaine-${isoWeek}.pdf`, content: pdfBuffer }],
  })
}
```

- [ ] **Step 3: Create `src/lib/report/generatePdfReport.ts`**

```ts
import type { TechnicianData } from '@/types/TechnicianData'
import { formatDuration } from '@/lib/time/formatDuration'

export async function generatePdfReport(isoWeek: string, data: TechnicianData[]): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const BLUE = '#0B5FA5'
    const DARK = '#10202B'
    const GREY = '#4A6270'
    const LIGHT = '#D3DDE3'
    const RED = '#A32B24'

    doc.fontSize(20).fillColor(BLUE).font('Helvetica-Bold')
      .text('Froid Gerber — Récapitulatif hebdomadaire', { align: 'center' })
    doc.fontSize(12).fillColor(GREY).font('Helvetica')
      .text(`Semaine ${isoWeek.split('-W')[1]} · ${isoWeek}`, { align: 'center' })
    doc.moveDown(1.5)

    doc.fontSize(14).fillColor(BLUE).font('Helvetica-Bold').text('Synthèse équipe')
    doc.moveDown(0.3)

    const colX = [40, 200, 340, 440]
    doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
    const headerY = doc.y
    doc.text('Technicien', colX[0], headerY, { width: 155 })
    doc.text('Total semaine', colX[1], headerY, { width: 135 })
    doc.text('Clients', colX[2], headerY, { width: 95 })
    doc.text('Jours', colX[3], headerY, { width: 80 })
    doc.moveDown(0.3)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(LIGHT).stroke()
    doc.moveDown(0.2)

    for (const tech of data) {
      const y = doc.y
      doc.fontSize(10).fillColor(DARK).font('Helvetica')
      doc.text(tech.name, colX[0], y, { width: 155 })
      doc.text(formatDuration(tech.weekTotalMinutes), colX[1], y, { width: 135 })
      doc.text(String(tech.hoursByClient.length), colX[2], y, { width: 95 })
      doc.text(String(tech.daysData.length), colX[3], y, { width: 80 })
      doc.moveDown(0.2)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(LIGHT).stroke()
      doc.moveDown(0.2)
    }

    doc.moveDown(1)

    for (const tech of data) {
      doc.addPage()
      doc.fontSize(16).fillColor(BLUE).font('Helvetica-Bold').text(tech.name)
      doc.fontSize(12).fillColor(GREY).font('Helvetica')
        .text(`Total semaine : ${formatDuration(tech.weekTotalMinutes)}`)
      doc.moveDown(0.8)

      if (tech.hoursByClient.length > 0) {
        doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text('Répartition par client')
        doc.moveDown(0.3)
        for (const hpc of tech.hoursByClient) {
          const lineY = doc.y
          doc.fontSize(10).fillColor(DARK).font('Helvetica')
          doc.text(hpc.clientName, 50, lineY, { width: 300 })
          doc.text(formatDuration(hpc.totalMinutes), 350, lineY, { width: 160, align: 'right' })
          doc.moveDown(0.3)
        }
        doc.moveDown(0.5)
      }

      for (const day of tech.daysData) {
        doc.fontSize(12).fillColor(BLUE).font('Helvetica-Bold')
          .text(`${day.dayLabel}  —  ${formatDuration(day.workedMinutes)}`, 40)
        doc.moveDown(0.2)
        doc.fontSize(10).fillColor(DARK).font('Helvetica')
        if (day.arrival) {
          doc.text([`Arrivée : ${day.arrival}`, day.departure ? `Départ : ${day.departure}` : 'Poste ouvert'].join('   '), 50)
        }
        if (day.lunchBreakLabel) doc.text(`Pause déjeuner : ${day.lunchBreakLabel}`, 50)
        for (const b of day.otherBreaks) doc.text(`Pause : ${b}`, 50)

        if (day.interventions.length > 0) {
          doc.moveDown(0.3)
          const hy = doc.y
          doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold')
          doc.text('Heures', 50, hy, { width: 80 })
          doc.text('Client', 130, hy, { width: 170 })
          doc.text('Durée', 300, hy, { width: 70 })
          doc.text('Trajet A/R', 370, hy, { width: 80 })
          doc.text('Total', 450, hy, { width: 60 })
          doc.moveDown(0.2)
          doc.moveTo(50, doc.y).lineTo(515, doc.y).strokeColor(LIGHT).stroke()
          doc.moveDown(0.1)

          for (const interv of day.interventions) {
            const heures = `${interv.startTime}${interv.endTime ? ` → ${interv.endTime}` : ''}`
            doc.fontSize(9).fillColor(DARK).font('Helvetica')
            const ry = doc.y + 2
            doc.text(heures, 50, ry, { width: 80 })
            doc.text(interv.clientName, 130, ry, { width: 170 })
            doc.text(interv.durationMinutes !== null ? formatDuration(interv.durationMinutes) : '—', 300, ry, { width: 70 })
            doc.text(interv.travelMinutes > 0 ? formatDuration(interv.travelMinutes * 2) : '—', 370, ry, { width: 80 })
            doc.text(interv.totalMinutes !== null ? formatDuration(interv.totalMinutes) : '—', 450, ry, { width: 60 })
            if (interv.workReport) {
              doc.moveDown(0.1)
              doc.fontSize(8).fillColor(GREY).font('Helvetica-Oblique')
                .text(interv.workReport, 130, doc.y, { width: 380 })
            }
            doc.moveDown(0.2)
            doc.moveTo(50, doc.y).lineTo(515, doc.y).strokeColor(LIGHT).stroke()
            doc.moveDown(0.1)
          }
        }

        if (day.anomalies.length > 0) {
          doc.moveDown(0.2)
          for (const a of day.anomalies) {
            doc.fontSize(9).fillColor(RED).font('Helvetica').text(`! ${a}`, 50)
          }
        }

        doc.moveDown(0.8)
        if (doc.y > 720) doc.addPage()
      }
    }

    doc.end()
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/report/
git commit -m "refactor: split email/pdf report libs into src/lib/report/ (English names)"
```

---

## Task 8: Create src/actions/shift/ files

**Files:** Create 10 files in `src/actions/shift/`

Each file starts with `'use server'`.

- [ ] **Step 1: Create `src/actions/shift/clockIn.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { findShiftByClientKey } from '@/lib/queries/findShiftByClientKey'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function clockIn(idempotencyKey: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await findShiftByClientKey(idempotencyKey)
  if (existing) return { ok: true as const, data: existing }

  const openShift = await getOpenShift(userId)
  if (openShift) return { ok: false as const, error: 'Vous êtes déjà au travail.' }

  const shift = await prisma.shift.create({
    data: { userId, startAt: now(), startOrigin: 'APP', idempotencyKey },
  })

  revalidatePath('/')
  return { ok: true as const, data: shift }
}
```

- [ ] **Step 2: Create `src/actions/shift/cancelClockIn.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function cancelClockIn(shiftId: string) {
  const session = await getSession()
  const userId = session.user.id

  const shift = await prisma.shift.findFirst({ where: { id: shiftId, userId } })
  if (!shift) return { ok: false as const, error: 'Shift not found.' }

  await prisma.shift.delete({ where: { id: shiftId } })

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 3: Create `src/actions/shift/startBreak.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function startBreak(type: 'LUNCH' | 'SHORT', idempotencyKey: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await prisma.break.findUnique({ where: { idempotencyKey } })
  if (existing) return { ok: true as const, data: existing }

  const shift = await getOpenShift(userId)
  if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }
  if (shift.breaks.find(b => !b.endAt)) return { ok: false as const, error: 'Une pause est déjà en cours.' }

  const breakRecord = await prisma.break.create({
    data: { shiftId: shift.id, type, startAt: now(), startOrigin: 'APP', idempotencyKey },
  })

  revalidatePath('/')
  return { ok: true as const, data: breakRecord }
}
```

- [ ] **Step 4: Create `src/actions/shift/cancelBreak.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function cancelBreak(breakId: string) {
  const session = await getSession()
  const userId = session.user.id

  const breakRecord = await prisma.break.findFirst({
    where: { id: breakId },
    include: { shift: true },
  })
  if (!breakRecord || breakRecord.shift.userId !== userId) return { ok: false as const, error: 'Break not found.' }

  await prisma.break.delete({ where: { id: breakId } })

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 5: Create `src/actions/shift/resumeWork.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function resumeWork() {
  const session = await getSession()
  const userId = session.user.id

  const shift = await getOpenShift(userId)
  if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }

  const openBreak = shift.breaks.find(b => !b.endAt)
  if (!openBreak) return { ok: false as const, error: 'Aucune pause en cours.' }
  if (openBreak.endAt) return { ok: true as const }

  await prisma.break.update({
    where: { id: openBreak.id },
    data: { endAt: now(), endOrigin: 'APP' },
  })

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 6: Create `src/actions/shift/cancelResumeWork.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function cancelResumeWork(breakId: string) {
  const session = await getSession()
  const userId = session.user.id

  const breakRecord = await prisma.break.findFirst({
    where: { id: breakId },
    include: { shift: true },
  })
  if (!breakRecord || breakRecord.shift.userId !== userId) return { ok: false as const, error: 'Break not found.' }

  await prisma.break.update({
    where: { id: breakId },
    data: { endAt: null, endOrigin: null },
  })

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 7: Create `src/actions/shift/endDay.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { getOpenIntervention } from '@/lib/queries/getOpenIntervention'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function endDay() {
  const session = await getSession()
  const userId = session.user.id

  const shift = await getOpenShift(userId)
  if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }

  const openIntervention = await getOpenIntervention(userId)
  if (openIntervention) return { ok: false as const, error: "Terminez d'abord votre intervention en cours." }

  await prisma.shift.update({
    where: { id: shift.id },
    data: { endAt: now(), endOrigin: 'APP' },
  })

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 8: Create `src/actions/shift/cancelEndDay.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function cancelEndDay(shiftId: string) {
  const session = await getSession()
  const userId = session.user.id

  const shift = await prisma.shift.findFirst({ where: { id: shiftId, userId } })
  if (!shift) return { ok: false as const, error: 'Shift not found.' }

  await prisma.shift.update({
    where: { id: shiftId },
    data: { endAt: null, endOrigin: null },
  })

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 9: Create `src/actions/shift/resumeDay.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { findShiftByClientKey } from '@/lib/queries/findShiftByClientKey'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function resumeDay(idempotencyKey: string) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await findShiftByClientKey(idempotencyKey)
  if (existing) return { ok: true as const, data: existing }

  const shift = await prisma.shift.create({
    data: { userId, startAt: now(), startOrigin: 'APP', idempotencyKey },
  })

  revalidatePath('/')
  return { ok: true as const, data: shift }
}
```

- [ ] **Step 10: Create `src/actions/shift/manualTimestamp.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { findShiftByClientKey } from '@/lib/queries/findShiftByClientKey'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'
import type { ManualTimestampInput } from '@/types/ManualTimestampInput'

export async function manualTimestamp(data: ManualTimestampInput) {
  const session = await getSession()
  const userId = session.user.id
  const currentTime = now()

  const start = new Date(data.startTime)
  if (start > currentTime) return { ok: false as const, error: "L'heure ne peut pas être dans le futur." }
  if (currentTime.getTime() - start.getTime() > 7 * 24 * 60 * 60 * 1000) {
    return { ok: false as const, error: 'Impossible de saisir une heure de plus de 7 jours.' }
  }

  if (data.type === 'ARRIVAL') {
    const existing = await findShiftByClientKey(data.idempotencyKey)
    if (existing) return { ok: true as const }
    await prisma.shift.create({
      data: { userId, startAt: start, startOrigin: 'MANUAL', idempotencyKey: data.idempotencyKey },
    })
  }

  if (data.type === 'DEPARTURE') {
    const shift = await getOpenShift(userId)
    if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }
    await prisma.shift.update({
      where: { id: shift.id },
      data: { endAt: start, endOrigin: 'MANUAL' },
    })
  }

  if (data.type === 'BREAK' && data.endTime && data.breakType) {
    const end = new Date(data.endTime)
    const shift = await getOpenShift(userId)
    if (!shift) return { ok: false as const, error: 'Aucun poste ouvert.' }
    const existing = await prisma.break.findUnique({ where: { idempotencyKey: data.idempotencyKey } })
    if (existing) return { ok: true as const }
    await prisma.break.create({
      data: {
        shiftId: shift.id,
        type: data.breakType,
        startAt: start,
        endAt: end,
        startOrigin: 'MANUAL',
        endOrigin: 'MANUAL',
        idempotencyKey: data.idempotencyKey,
      },
    })
  }

  revalidatePath('/')
  return { ok: true as const }
}
```

- [ ] **Step 11: Commit**

```bash
git add src/actions/shift/
git commit -m "refactor: split pointage.ts into src/actions/shift/ (English names)"
```

---

## Task 9: Create src/actions/intervention/ files

**Files:** Create 6 files in `src/actions/intervention/`

- [ ] **Step 1: Create `src/actions/intervention/startIntervention.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { getOpenShift } from '@/lib/queries/getOpenShift'
import { clockIn } from '@/actions/shift/clockIn'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

export async function startIntervention(data: {
  type: 'CLIENT' | 'WORKSHOP'
  clientId?: string
  travelMinutes: number
  idempotencyKey: string
}) {
  const session = await getSession()
  const userId = session.user.id

  const existing = await prisma.intervention.findUnique({ where: { idempotencyKey: data.idempotencyKey } })
  if (existing) return { ok: true as const, data: existing }

  const openIntervention = await prisma.intervention.findFirst({ where: { userId, endAt: null } })
  if (openIntervention) return { ok: false as const, error: 'Une intervention est déjà en cours.' }

  const shift = await getOpenShift(userId)
  if (!shift) await clockIn(uuidv4())

  const intervention = await prisma.intervention.create({
    data: {
      userId,
      type: data.type,
      clientId: data.type === 'CLIENT' ? data.clientId : null,
      travelMinutes: data.travelMinutes,
      startAt: now(),
      origin: 'APP',
      idempotencyKey: data.idempotencyKey,
    },
  })

  revalidatePath('/')
  revalidatePath('/interventions')
  return { ok: true as const, data: intervention }
}
```

- [ ] **Step 2: Create `src/actions/intervention/endIntervention.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { now } from '@/lib/time/now'
import { revalidatePath } from 'next/cache'

export async function endIntervention(interventionId: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false as const, error: 'Intervention not found.' }
  if (intervention.endAt) return { ok: true as const }

  await prisma.intervention.update({
    where: { id: interventionId },
    data: { endAt: now() },
  })

  revalidatePath('/')
  revalidatePath('/interventions')
  revalidatePath(`/intervention/${interventionId}`)
  return { ok: true as const }
}
```

- [ ] **Step 3: Create `src/actions/intervention/saveWorkReport.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function saveWorkReport(interventionId: string, workReport: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false as const, error: 'Intervention not found.' }

  await prisma.intervention.update({
    where: { id: interventionId },
    data: { workReport },
  })

  revalidatePath(`/intervention/${interventionId}`)
  revalidatePath('/interventions')
  return { ok: true as const }
}
```

- [ ] **Step 4: Create `src/actions/intervention/getInterventionList.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'

export async function getInterventionList(userId: string) {
  return prisma.intervention.findMany({
    where: { userId },
    include: { client: true },
    orderBy: { startAt: 'desc' },
    take: 100,
  })
}
```

- [ ] **Step 5: Create `src/actions/intervention/updateIntervention.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'
import type { InterventionField } from '@/types/InterventionField'

export async function updateIntervention(
  interventionId: string,
  field: InterventionField,
  newValue: string,
  reason?: string
) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false, error: 'Intervention not found.' }

  let updateData: Record<string, unknown> = {}
  const oldValue = String(intervention[field as keyof typeof intervention] ?? '')

  switch (field) {
    case 'startAt':
    case 'endAt':
      updateData[field] = new Date(newValue)
      break
    case 'travelMinutes':
      updateData[field] = parseInt(newValue, 10)
      break
    case 'clientId':
      updateData.clientId = newValue || null
      updateData.type = newValue ? 'CLIENT' : 'WORKSHOP'
      break
    case 'type':
      updateData.type = newValue
      if (newValue === 'WORKSHOP') updateData.clientId = null
      break
    default:
      updateData[field] = newValue
  }

  if (field === 'endAt' && updateData.endAt) {
    if ((updateData.endAt as Date) <= intervention.startAt) {
      return { ok: false, error: "L'heure de fin doit être après l'heure de début." }
    }
  }

  await prisma.$transaction([
    prisma.intervention.update({ where: { id: interventionId }, data: updateData }),
    prisma.auditLog.create({
      data: {
        entity: 'Intervention',
        entityId: interventionId,
        field,
        oldValue,
        newValue,
        changedByUserId: userId,
        reason: reason ?? null,
      },
    }),
  ])

  revalidatePath(`/intervention/${interventionId}`)
  revalidatePath('/interventions')
  revalidatePath('/semaine')
  return { ok: true }
}
```

- [ ] **Step 6: Create `src/actions/intervention/deleteIntervention.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { revalidatePath } from 'next/cache'

export async function deleteIntervention(interventionId: string) {
  const session = await getSession()
  const userId = session.user.id

  const intervention = await prisma.intervention.findUnique({ where: { id: interventionId } })
  if (!intervention || intervention.userId !== userId) return { ok: false, error: 'Intervention not found.' }

  await prisma.intervention.delete({ where: { id: interventionId } })

  revalidatePath('/interventions')
  revalidatePath('/semaine')
  return { ok: true }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/actions/intervention/
git commit -m "refactor: split interventions.ts into src/actions/intervention/ (English names)"
```

---

## Task 10: Create src/actions/client/ and src/actions/auth/

**Files:** Create 4 files

- [ ] **Step 1: Create `src/actions/client/searchClients.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { normalizeClientName } from '@/lib/queries/normalizeClientName'

export async function searchClients(query: string) {
  const normalized = normalizeClientName(query)
  return prisma.client.findMany({
    where: { active: true, normalizedName: { contains: normalized } },
    orderBy: { name: 'asc' },
    take: 10,
  })
}
```

- [ ] **Step 2: Create `src/actions/client/getAllClients.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'

export async function getAllClients(): Promise<{ id: string; name: string; normalizedName: string }[]> {
  await getSession()
  return prisma.client.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, normalizedName: true },
  })
}
```

- [ ] **Step 3: Create `src/actions/client/createClient.ts`**

```ts
'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/getSession'
import { normalizeClientName } from '@/lib/queries/normalizeClientName'

export async function createClient(name: string): Promise<{ ok: boolean; data?: { id: string; name: string; normalizedName: string } }> {
  const session = await getSession()
  const createdById = session.user.id
  const normalizedName = normalizeClientName(name)

  const existing = await prisma.client.findUnique({ where: { normalizedName } })
  if (existing) return { ok: true, data: { id: existing.id, name: existing.name, normalizedName: existing.normalizedName } }

  const client = await prisma.client.create({
    data: { name: name.trim(), normalizedName, createdById },
  })
  return { ok: true, data: { id: client.id, name: client.name, normalizedName: client.normalizedName } }
}
```

- [ ] **Step 4: Create `src/actions/auth/markPasswordChanged.ts`**

```ts
'use server'

import { getSession } from '@/lib/auth/getSession'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function markPasswordChanged() {
  const session = await getSession()
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  })
  revalidatePath('/')
}
```

- [ ] **Step 5: Commit**

```bash
git add src/actions/client/ src/actions/auth/
git commit -m "refactor: split client/auth actions into subdirectories (English names)"
```

---

## Task 11: Rename and update src/components/

**Files:** Create new component files, delete old ones.

Read each old component file before rewriting it. The internal logic stays identical — only names change.

- [ ] **Step 1: Create `src/components/day/` directory and move/rename files**

For each file below, create the new file with the renamed export, then delete the old file.

`src/components/day/Timer.tsx` (was `journee/Chrono.tsx`) — rename export `Chrono` → `Timer`, rename all internal French variable/function names to English.

`src/components/day/StatusBanner.tsx` (was `journee/BandeauEtat.tsx`) — rename export `BandeauEtat` → `StatusBanner`.

`src/components/day/CancellationBanner.tsx` (was `journee/BandeauAnnulation.tsx`) — rename export `BandeauAnnulation` → `CancellationBanner`.

`src/components/day/DayScreen.tsx` (was `journee/EcranJournee.tsx`) — rename export `EcranJournee` → `DayScreen`. Update all imports from old action names to new (e.g. `arriver` → `clockIn` from `@/actions/shift/clockIn`).

- [ ] **Step 2: Rename layout components**

`src/components/layout/OfflineBanner.tsx` (was `BandeauHorsLigne.tsx`) — rename export `BandeauHorsLigne` → `OfflineBanner`.

- [ ] **Step 3: Rename intervention components**

`src/components/intervention/WorkReportChips.tsx` (was `ChipsCompteRendu.tsx`) — rename export `ChipsCompteRendu` → `WorkReportChips`.

`src/components/intervention/WorkReportForm.tsx` (was `CompteRenduForm.tsx`) — rename export `CompteRenduForm` → `WorkReportForm`. Update import of `enregistrerCompteRendu` → `saveWorkReport` from `@/actions/intervention/saveWorkReport`.

`src/components/intervention/ClientSearchModal.tsx` (was `RechercheClientModal.tsx`) — rename export `RechercheClientModal` → `ClientSearchModal`. Update imports of `chercherClients` → `searchClients`, `creerClient` → `createClient`.

- [ ] **Step 4: Rename settings and week components**

`src/components/settings/SettingsView.tsx` (was `reglages/ReglagesView.tsx`) — rename export `ReglagesView` → `SettingsView`.

`src/components/week/WeekView.tsx` (was `semaine/SemaineView.tsx`) — rename export `SemaineView` → `WeekView`. Update all references to old field names (e.g. `debutAt` → `startAt`, `finAt` → `endAt`, `compteRendu` → `workReport`, `trajetMinutes` → `travelMinutes`).

- [ ] **Step 5: Delete old component directories**

```bash
rm -rf src/components/journee src/components/semaine src/components/reglages
rm src/components/layout/BandeauHorsLigne.tsx
rm src/components/intervention/ChipsCompteRendu.tsx
rm src/components/intervention/CompteRenduForm.tsx
rm src/components/intervention/RechercheClientModal.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "refactor: rename all components to English, reorganize into day/week/settings/"
```

---

## Task 12: Update all page files and API routes

**Files:** Modify all `page.tsx`, `layout.tsx`, and API route files.

- [ ] **Step 1: Update `src/app/(app)/layout.tsx`**

Replace import of `BandeauHorsLigne` → `OfflineBanner`:

```ts
import { BottomNav } from '@/components/layout/BottomNav'
import { OfflineBanner } from '@/components/layout/OfflineBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfflineBanner />
      <main style={{ paddingBottom: 80, minHeight: '100vh', background: 'var(--fond)' }}>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
```

- [ ] **Step 2: Update `src/app/(app)/page.tsx`**

Replace import of `EcranJournee` → `DayScreen` from `@/components/day/DayScreen`. Update all field name references (`debutAt` → `startAt`, `finAt` → `endAt`, `pauses` → `breaks`, `cleClient` → `idempotencyKey`, `origineDebut` → `startOrigin`, `origineFin` → `endOrigin`).

- [ ] **Step 3: Update `src/app/(app)/semaine/page.tsx`**

Replace import of `SemaineView` → `WeekView` from `@/components/week/WeekView`. Update all Prisma query field names (`debutAt` → `startAt`, `finAt` → `endAt`, etc.). Update all serialized field names passed as props.

- [ ] **Step 4: Update `src/app/(app)/intervention/nouvelle/page.tsx`**

Update imports: `demarrerIntervention` → `startIntervention` from `@/actions/intervention/startIntervention`, `chercherClients` → `searchClients`, etc. Update field references.

- [ ] **Step 5: Update `src/app/(app)/intervention/[id]/page.tsx`**

Update imports to `InterventionDetail` (unchanged file name), update action imports (`modifierIntervention` → `updateIntervention`, `supprimerIntervention` → `deleteIntervention`). Update field names (`compteRendu` → `workReport`, `trajetMinutes` → `travelMinutes`, `debutAt` → `startAt`, `finAt` → `endAt`).

- [ ] **Step 6: Update `src/app/(app)/intervention/[id]/fin/page.tsx`**

Update import `enregistrerCompteRendu` → `saveWorkReport`. Update imports of `CompteRenduForm` → `WorkReportForm`. Update field names.

- [ ] **Step 7: Update `src/app/(app)/interventions/page.tsx`**

Update field name references in Prisma queries and component props.

- [ ] **Step 8: Update `src/app/(app)/oubli/page.tsx`**

Update import `pointageManuel` → `manualTimestamp` from `@/actions/shift/manualTimestamp`.

- [ ] **Step 9: Update `src/app/(app)/reglages/page.tsx`**

Update import `ReglagesView` → `SettingsView` from `@/components/settings/SettingsView`. Update `marquerMotDePasseChange` → `markPasswordChanged`.

- [ ] **Step 10: Update `src/app/changer-mot-de-passe/page.tsx`**

Update import `marquerMotDePasseChange` → `markPasswordChanged` from `@/actions/auth/markPasswordChanged`. Update `doitChangerMotDePasse` → `mustChangePassword`, `actif` → `active`.

- [ ] **Step 11: Update `src/proxy.ts`**

Update `session.user.doitChangerMotDePasse` → `session.user.mustChangePassword`.

- [ ] **Step 12: Update `src/app/api/cron/rapport-hebdo/route.ts`**

Update imports: `aggregerSemaine` → `aggregateWeek` from `@/lib/aggregation/aggregateWeek`, `getSemaineIsoActuelle` → `getCurrentIsoWeek` from `@/lib/aggregation/getCurrentIsoWeek`, `genererPdfRapport` → `generatePdfReport` from `@/lib/report/generatePdfReport`, `envoyerRapport` → `sendReport` from `@/lib/report/sendReport`. Update `prisma.rapportHebdo` → `prisma.weeklyReport`. Update field names (`semaineIso` → `isoWeek`, `statut` → `status`, `envoyeAt` → `sentAt`, `verrouillee` → `locked`, `destinataires` → `recipients`, `erreur` → `error`).

- [ ] **Step 13: Update `src/app/api/cron/purge/route.ts`**

Update `prisma.poste` → `prisma.shift`, `prisma.pause` → `prisma.break`, field names (`debutAt` → `startAt`, `finAt` → `endAt`).

- [ ] **Step 14: Rename `src/app/api/test-rapport/` → `src/app/api/test-report/`**

Move file and update all imports inside it.

- [ ] **Step 15: Rename `scripts/creer-utilisateur.ts` → `scripts/createUser.ts`**

Update function name and internal comments to English.

- [ ] **Step 16: Commit**

```bash
git add src/app/ src/proxy.ts scripts/
git commit -m "refactor: update all page/route/script imports to English names"
```

---

## Task 13: Delete old files and verify build

- [ ] **Step 1: Delete old lib files**

```bash
rm src/lib/temps.ts src/lib/calculs.ts src/lib/aggregation.ts src/lib/email-rapport.ts src/lib/pdf-rapport.ts
```

- [ ] **Step 2: Delete old action files**

```bash
rm src/actions/pointage.ts src/actions/interventions.ts src/actions/clients.ts src/actions/auth.ts
```

- [ ] **Step 3: Delete old type files created before this plan (if any)**

```bash
rm -f src/types/PosteSimple.ts src/types/PauseSimple.ts src/types/DayData.ts src/types/InterventionData.ts src/types/TechnicianData.ts
```

(These were partially created before the plan — the correct versions are in Task 2.)

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any remaining import or type errors before proceeding.

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: successful build with no errors.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "refactor: delete old French-named files, verify build passes"
```
