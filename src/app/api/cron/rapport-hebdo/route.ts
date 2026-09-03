import { NextRequest, NextResponse } from 'next/server'
import { toZonedTime } from 'date-fns-tz'
import { getDay, getHours } from 'date-fns'
import { aggregateWeek } from '@/lib/aggregation/aggregateWeek'
import { getCurrentIsoWeek } from '@/lib/aggregation/getCurrentIsoWeek'
import { generatePdfReport } from '@/lib/report/generatePdfReport'
import { sendReport } from '@/lib/report/sendReport'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

const TZ = 'Europe/Paris'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowParis = toZonedTime(new Date(), TZ)
  const dayOfWeek = getDay(nowParis)
  const hour = getHours(nowParis)
  const isSunday = dayOfWeek === 0 && hour >= 20
  const isMondayNight = dayOfWeek === 1 && hour < 2

  if (!isSunday && !isMondayNight) {
    console.log(`[rapport] Hors fenêtre — jour ${dayOfWeek} heure ${hour} Paris, skip`)
    return NextResponse.json({ message: 'Hors fenêtre de déclenchement' })
  }

  const isoWeek = getCurrentIsoWeek()

  const existing = await prisma.weeklyReport.findUnique({ where: { isoWeek } })
  if (existing && existing.status === 'ENVOYE') {
    return NextResponse.json({ message: `Rapport ${isoWeek} déjà envoyé` })
  }

  await prisma.weeklyReport.upsert({
    where: { isoWeek },
    create: {
      isoWeek,
      status: 'EN_ATTENTE',
      recipients: (process.env.RAPPORT_DESTINATAIRES ?? '').split(',').map(s => s.trim()).filter(Boolean),
    },
    update: { status: 'EN_ATTENTE', error: null },
  })

  try {
    const data = await aggregateWeek(isoWeek)
    const pdfBuffer = await generatePdfReport(isoWeek, data)
    await sendReport(isoWeek, data, pdfBuffer)

    await prisma.weeklyReport.update({
      where: { isoWeek },
      data: {
        status: 'ENVOYE',
        sentAt: new Date(),
        locked: true,
      },
    })

    return NextResponse.json({ ok: true, isoWeek, technicians: data.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[rapport] Erreur:', message)

    await prisma.weeklyReport.update({
      where: { isoWeek },
      data: { status: 'ECHEC', error: message },
    })

    try {
      const apiKey = process.env.RESEND_API_KEY
      if (apiKey) {
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)
        const firstDest = (process.env.RAPPORT_DESTINATAIRES ?? '').split(',')[0]?.trim()
        if (firstDest) {
          await resend.emails.send({
            from: 'Froid Gerber <noreply@froid-gerber.fr>',
            to: [firstDest],
            subject: `Echec rapport semaine ${isoWeek}`,
            html: `<p>Le rapport de la semaine ${isoWeek} n'a pas pu être généré.</p><p>Erreur : ${message}</p>`,
          })
        }
      }
    } catch { /* ignore notification failure */ }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
