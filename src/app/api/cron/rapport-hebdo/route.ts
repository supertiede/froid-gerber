import { NextRequest, NextResponse } from 'next/server'
import { toZonedTime } from 'date-fns-tz'
import { getDay, getHours } from 'date-fns'
import { aggregerSemaine, getSemaineIsoActuelle } from '@/lib/aggregation'
import { genererPdfRapport } from '@/lib/pdf-rapport'
import { envoyerRapport } from '@/lib/email-rapport'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

const TZ = 'Europe/Paris'

export async function GET(request: NextRequest) {
  // 1. Authenticate cron request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Timezone guard: must be Sunday (0) between 20h and Monday 02h Paris time
  const nowParis = toZonedTime(new Date(), TZ)
  const jourSemaine = getDay(nowParis) // 0=Sunday, 1=Monday
  const heure = getHours(nowParis)
  const estDimanche = jourSemaine === 0 && heure >= 20
  const estLundiNuit = jourSemaine === 1 && heure < 2

  if (!estDimanche && !estLundiNuit) {
    console.log(`[rapport] Hors fenêtre — jour ${jourSemaine} heure ${heure} Paris, skip`)
    return NextResponse.json({ message: 'Hors fenêtre de déclenchement' })
  }

  // 3. Determine which week: use current ISO week (Sunday is still in the week being closed)
  const semaineIso = getSemaineIsoActuelle()

  // 4. Idempotence: skip if already sent
  const existing = await prisma.rapportHebdo.findUnique({ where: { semaineIso } })
  if (existing && existing.statut === 'ENVOYE') {
    return NextResponse.json({ message: `Rapport ${semaineIso} déjà envoyé` })
  }

  // 5. Create or update rapport record
  await prisma.rapportHebdo.upsert({
    where: { semaineIso },
    create: {
      semaineIso,
      statut: 'EN_ATTENTE',
      destinataires: (process.env.RAPPORT_DESTINATAIRES ?? '').split(',').map(s => s.trim()).filter(Boolean),
    },
    update: { statut: 'EN_ATTENTE', erreur: null },
  })

  try {
    // 6. Aggregate data
    const donnees = await aggregerSemaine(semaineIso)

    // 7. Generate PDF
    const pdfBuffer = await genererPdfRapport(semaineIso, donnees)

    // 8. Send email
    await envoyerRapport(semaineIso, donnees, pdfBuffer)

    // 9. Mark as sent + lock week
    await prisma.rapportHebdo.update({
      where: { semaineIso },
      data: {
        statut: 'ENVOYE',
        envoyeAt: new Date(),
        verrouillee: true,
      },
    })

    return NextResponse.json({ ok: true, semaineIso, techniciens: donnees.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[rapport] Erreur:', message)

    await prisma.rapportHebdo.update({
      where: { semaineIso },
      data: { statut: 'ECHEC', erreur: message },
    })

    // Notify admin via Resend if possible
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
            subject: `Echec rapport semaine ${semaineIso}`,
            html: `<p>Le rapport de la semaine ${semaineIso} n'a pas pu être généré.</p><p>Erreur : ${message}</p>`,
          })
        }
      }
    } catch { /* ignore notification failure */ }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
