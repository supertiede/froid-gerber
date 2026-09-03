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
          doc.text('Client', 130, hy, { width: 130 })
          doc.text('Durée', 260, hy, { width: 70 })
          doc.text('Trajet A/R', 330, hy, { width: 80 })
          doc.text('Total', 410, hy, { width: 70 })
          doc.moveDown(0.3)

          for (const i of day.interventions) {
            const iy = doc.y
            doc.fontSize(9).fillColor(DARK).font('Helvetica')
            doc.text(`${i.startTime}${i.endTime ? ` → ${i.endTime}` : ''}`, 50, iy, { width: 80 })
            doc.text(i.clientName, 130, iy, { width: 130 })
            doc.text(i.durationMinutes !== null ? formatDuration(i.durationMinutes) : '—', 260, iy, { width: 70 })
            doc.text(i.travelMinutes > 0 ? formatDuration(i.travelMinutes * 2) : '—', 330, iy, { width: 80 })
            doc.text(i.totalMinutes !== null ? formatDuration(i.totalMinutes) : '—', 410, iy, { width: 70 })
            doc.moveDown(0.3)
            if (i.workReport) {
              doc.fontSize(8).fillColor(GREY).text(`↳ ${i.workReport}`, 130, doc.y, { width: 350 })
              doc.moveDown(0.2)
            }
          }
        }

        if (day.anomalies.length > 0) {
          doc.fontSize(9).fillColor(RED).text(`⚠ ${day.anomalies.join(' — ')}`, 50)
        }

        doc.moveDown(0.8)
      }
    }

    doc.end()
  })
}
