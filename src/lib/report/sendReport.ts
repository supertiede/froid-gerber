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
