import { NextRequest, NextResponse } from 'next/server'
import { aggregateWeek } from '@/lib/aggregation/aggregateWeek'
import { getCurrentIsoWeek } from '@/lib/aggregation/getCurrentIsoWeek'
import { generatePdfReport } from '@/lib/report/generatePdfReport'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const isoWeek = getCurrentIsoWeek()
  const data = await aggregateWeek(isoWeek)
  const pdfBuffer = await generatePdfReport(isoWeek, data)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="recap-${isoWeek}.pdf"`,
    },
  })
}
