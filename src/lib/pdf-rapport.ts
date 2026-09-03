import type { DonneesTechnicien } from './aggregation'
import { formatDuree } from './temps'

export async function genererPdfRapport(
  semaineIso: string,
  donnees: DonneesTechnicien[]
): Promise<Buffer> {
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

    // --- Header ---
    doc.fontSize(20).fillColor(BLUE).font('Helvetica-Bold')
      .text('Froid Gerber — Récapitulatif hebdomadaire', { align: 'center' })
    doc.fontSize(12).fillColor(GREY).font('Helvetica')
      .text(`Semaine ${semaineIso.split('-W')[1]} · ${semaineIso}`, { align: 'center' })
    doc.moveDown(1.5)

    // --- Synthèse équipe ---
    doc.fontSize(14).fillColor(BLUE).font('Helvetica-Bold')
      .text('Synthèse équipe')
    doc.moveDown(0.3)

    // Table header
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

    for (const tech of donnees) {
      const y = doc.y
      doc.fontSize(10).fillColor(DARK).font('Helvetica')
      doc.text(tech.name, colX[0], y, { width: 155 })
      doc.text(formatDuree(tech.totalSemaineMinutes), colX[1], y, { width: 135 })
      doc.text(String(tech.heuresParClient.length), colX[2], y, { width: 95 })
      doc.text(String(tech.joursData.length), colX[3], y, { width: 80 })
      doc.moveDown(0.2)
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(LIGHT).stroke()
      doc.moveDown(0.2)
    }

    doc.moveDown(1)

    // --- Par technicien ---
    for (const tech of donnees) {
      doc.addPage()

      // Technicien header
      doc.fontSize(16).fillColor(BLUE).font('Helvetica-Bold')
        .text(tech.name)
      doc.fontSize(12).fillColor(GREY).font('Helvetica')
        .text(`Total semaine : ${formatDuree(tech.totalSemaineMinutes)}`)
      doc.moveDown(0.8)

      // Répartition par client
      if (tech.heuresParClient.length > 0) {
        doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text('Répartition par client')
        doc.moveDown(0.3)
        for (const hpc of tech.heuresParClient) {
          const lineY = doc.y
          doc.fontSize(10).fillColor(DARK).font('Helvetica')
          doc.text(hpc.clientNom, 50, lineY, { width: 300 })
          doc.text(formatDuree(hpc.totalMinutes), 350, lineY, { width: 160, align: 'right' })
          doc.moveDown(0.3)
        }
        doc.moveDown(0.5)
      }

      // Jours
      for (const jour of tech.joursData) {
        // Day header
        doc.fontSize(12).fillColor(BLUE).font('Helvetica-Bold')
        doc.text(`${jour.jourLabel}  —  ${formatDuree(jour.heuresTravailleesMinutes)}`, 40)
        doc.moveDown(0.2)

        // Poste info
        doc.fontSize(10).fillColor(DARK).font('Helvetica')
        if (jour.arrivee) {
          const ligne = [`Arrivée : ${jour.arrivee}`, jour.depart ? `Départ : ${jour.depart}` : 'Poste ouvert'].join('   ')
          doc.text(ligne, 50)
        }
        if (jour.pauseDejeLabel) doc.text(`Pause déjeuner : ${jour.pauseDejeLabel}`, 50)
        for (const p of jour.autresPauses) doc.text(`Pause : ${p}`, 50)

        // Interventions table
        if (jour.interventions.length > 0) {
          doc.moveDown(0.3)
          const interHeaderY = doc.y
          doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold')
          doc.text('Heures', 50, interHeaderY, { width: 80 })
          doc.text('Client', 130, interHeaderY, { width: 170 })
          doc.text('Durée', 300, interHeaderY, { width: 70 })
          doc.text('Trajet A/R', 370, interHeaderY, { width: 80 })
          doc.text('Total', 450, interHeaderY, { width: 60 })
          doc.moveDown(0.2)
          doc.moveTo(50, doc.y).lineTo(515, doc.y).strokeColor(LIGHT).stroke()
          doc.moveDown(0.1)

          for (const interv of jour.interventions) {
            const heures = `${interv.heureDebut}${interv.heureFin ? ` → ${interv.heureFin}` : ''}`
            doc.fontSize(9).fillColor(DARK).font('Helvetica')
            const ry = doc.y + 2
            doc.text(heures, 50, ry, { width: 80 })
            doc.text(interv.clientNom, 130, ry, { width: 170 })
            doc.text(interv.dureeMinutes !== null ? formatDuree(interv.dureeMinutes) : '—', 300, ry, { width: 70 })
            doc.text(interv.trajetMinutes > 0 ? formatDuree(interv.trajetMinutes * 2) : '—', 370, ry, { width: 80 })
            doc.text(interv.totalMinutes !== null ? formatDuree(interv.totalMinutes) : '—', 450, ry, { width: 60 })
            if (interv.compteRendu) {
              doc.moveDown(0.1)
              doc.fontSize(8).fillColor(GREY).font('Helvetica-Oblique')
                .text(interv.compteRendu, 130, doc.y, { width: 380 })
            }
            doc.moveDown(0.2)
            doc.moveTo(50, doc.y).lineTo(515, doc.y).strokeColor(LIGHT).stroke()
            doc.moveDown(0.1)
          }
        }

        // Anomalies
        if (jour.anomalies.length > 0) {
          doc.moveDown(0.2)
          for (const a of jour.anomalies) {
            doc.fontSize(9).fillColor(RED).font('Helvetica')
              .text(`! ${a}`, 50)
          }
        }

        doc.moveDown(0.8)

        // Page break safety
        if (doc.y > 720) doc.addPage()
      }
    }

    doc.end()
  })
}
