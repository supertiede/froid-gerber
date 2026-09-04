/**
 * Merge duplicate shifts on the same calendar day (Europe/Paris).
 *
 * For each user+day with multiple shifts:
 *   - Keep the shift with the earliest startAt
 *   - Set its endAt to the latest endAt of all same-day shifts (null if any are still open)
 *   - Reassign all breaks from duplicate shifts to the kept shift
 *   - Delete the duplicates
 *
 * Run: npx ts-node --esm scripts/deduplicateShifts.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'

const TZ = 'Europe/Paris'

function toParisDay(date: Date): string {
  return date.toLocaleDateString('fr-FR', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

  const allShifts = await prisma.shift.findMany({
    include: { breaks: true },
    orderBy: { startAt: 'asc' },
  })

  // Group by userId + Paris day
  const groups = new Map<string, typeof allShifts>()
  for (const shift of allShifts) {
    const key = `${shift.userId}::${toParisDay(shift.startAt)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(shift)
  }

  let mergedDays = 0
  let deletedShifts = 0

  for (const [key, shifts] of groups) {
    if (shifts.length <= 1) continue

    console.log(`\n[DOUBLON] ${key} — ${shifts.length} shifts`)
    shifts.forEach(s => console.log(`  ${s.id}  ${s.startAt.toISOString()} → ${s.endAt?.toISOString() ?? 'ouvert'}`))

    // Keep earliest, compute merged endAt
    const [kept, ...extras] = shifts // already sorted by startAt asc
    const allEndsAt = shifts.map(s => s.endAt)
    const hasOpenShift = allEndsAt.some(e => e === null)
    const mergedEndAt = hasOpenShift ? null : allEndsAt.reduce<Date | null>((latest, e) => {
      if (!e) return latest
      return !latest || e > latest ? e : latest
    }, null)

    console.log(`  → Garde: ${kept.id} | endAt fusionné: ${mergedEndAt?.toISOString() ?? 'null (ouvert)'}`)

    // Reassign breaks from duplicates to the kept shift
    const extraIds = extras.map(s => s.id)
    const reassigned = await prisma.break.updateMany({
      where: { shiftId: { in: extraIds } },
      data: { shiftId: kept.id },
    })
    if (reassigned.count > 0) console.log(`  → ${reassigned.count} pause(s) réaffectée(s)`)

    // Update kept shift endAt
    await prisma.shift.update({
      where: { id: kept.id },
      data: { endAt: mergedEndAt, endOrigin: mergedEndAt ? kept.endOrigin : null },
    })

    // Delete duplicates
    await prisma.shift.deleteMany({ where: { id: { in: extraIds } } })
    console.log(`  → ${extraIds.length} shift(s) supprimé(s)`)

    mergedDays++
    deletedShifts += extraIds.length
  }

  console.log(`\n✓ ${mergedDays} jour(s) nettoyé(s), ${deletedShifts} shift(s) supprimé(s)`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
