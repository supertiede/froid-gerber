import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

  try {
    const [interventions, shifts, auditLogs, reports] = await Promise.all([
      prisma.intervention.deleteMany({ where: { createdAt: { lt: fiveYearsAgo } } }),
      prisma.shift.deleteMany({ where: { createdAt: { lt: fiveYearsAgo } } }),
      prisma.auditLog.deleteMany({ where: { at: { lt: fiveYearsAgo } } }),
      prisma.weeklyReport.deleteMany({ where: { sentAt: { lt: fiveYearsAgo } } }),
    ])

    const total = interventions.count + shifts.count + auditLogs.count + reports.count
    console.log(`[purge] Supprimé : ${shifts.count} shifts, ${interventions.count} interventions, ${auditLogs.count} auditLogs, ${reports.count} reports (total : ${total})`)

    return NextResponse.json({ ok: true, deleted: { shifts: shifts.count, interventions: interventions.count, auditLogs: auditLogs.count, reports: reports.count } })
  } catch (err) {
    console.error('[purge] Erreur :', err)
    return NextResponse.json({ error: 'Erreur purge' }, { status: 500 })
  }
}
