import { NextRequest, NextResponse } from 'next/server'
import { aggregerSemaine, getSemaineIsoActuelle } from '@/lib/aggregation'
import { genererPdfRapport } from '@/lib/pdf-rapport'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const semaineIso = getSemaineIsoActuelle()
  const donnees = await aggregerSemaine(semaineIso)
  const pdfBuffer = await genererPdfRapport(semaineIso, donnees)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="recap-${semaineIso}.pdf"`,
    },
  })
}
