import type { DonneesTechnicien } from './aggregation'
import { formatDuree } from './temps'

export function genererHtmlRapport(
  semaineIso: string,
  donnees: DonneesTechnicien[]
): string {
  const semNum = semaineIso.split('-W')[1]

  const tableauEquipe = donnees.map(tech => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3">${tech.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3;font-weight:600">${formatDuree(tech.totalSemaineMinutes)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3">${tech.heuresParClient.length} clients</td>
    </tr>
  `).join('')

  const sections = donnees.map(tech => {
    const joursHtml = tech.joursData.map(jour => {
      const intervRows = jour.interventions.map(i => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.heureDebut}${i.heureFin ? ` → ${i.heureFin}` : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.clientNom}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.dureeMinutes !== null ? formatDuree(i.dureeMinutes) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.trajetMinutes > 0 ? formatDuree(i.trajetMinutes * 2) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;font-weight:600">${i.totalMinutes !== null ? formatDuree(i.totalMinutes) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;color:#4A6270">${i.compteRendu ?? ''}</td>
        </tr>
      `).join('')

      const anomaliesHtml = jour.anomalies.length > 0
        ? `<p style="color:#A32B24;font-size:13px;margin:4px 0">⚠ ${jour.anomalies.join(' — ')}</p>`
        : ''

      return `
        <div style="margin-bottom:24px">
          <div style="background:#F2F5F7;padding:8px 12px;border-left:4px solid #0B5FA5;margin-bottom:8px">
            <strong style="font-size:15px">${jour.jourLabel}</strong>
            <span style="float:right;font-weight:700">${formatDuree(jour.heuresTravailleesMinutes)}</span>
          </div>
          ${jour.arrivee ? `<p style="font-size:13px;color:#4A6270;margin:4px 0">Arrivée ${jour.arrivee}${jour.depart ? ` — Départ ${jour.depart}` : ' (poste ouvert)'}${jour.pauseDejeLabel ? ` — Déjeuner ${jour.pauseDejeLabel}` : ''}</p>` : ''}
          ${jour.interventions.length > 0 ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">
              <thead>
                <tr style="background:#F2F5F7">
                  <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Heures</th>
                  <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Client</th>
                  <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Durée</th>
                  <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Trajet A/R</th>
                  <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Total</th>
                  <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Compte rendu</th>
                </tr>
              </thead>
              <tbody>${intervRows}</tbody>
            </table>
          ` : '<p style="font-size:13px;color:#4A6270;margin:4px 0">Aucune intervention</p>'}
          ${anomaliesHtml}
        </div>
      `
    }).join('')

    const clientsHtml = tech.heuresParClient.map(hpc => `
      <tr>
        <td style="padding:4px 8px;font-size:13px">${hpc.clientNom}</td>
        <td style="padding:4px 8px;font-size:13px;font-weight:600;text-align:right">${formatDuree(hpc.totalMinutes)}</td>
      </tr>
    `).join('')

    return `
      <div style="margin-bottom:40px;page-break-inside:avoid">
        <h2 style="font-size:18px;color:#0B5FA5;border-bottom:2px solid #0B5FA5;padding-bottom:8px">
          ${tech.name} — ${formatDuree(tech.totalSemaineMinutes)}
        </h2>
        ${tech.heuresParClient.length > 0 ? `
          <table width="200" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px">
            <tbody>${clientsHtml}</tbody>
          </table>
        ` : ''}
        ${joursHtml}
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#10202B;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0B5FA5;color:#fff;padding:20px;border-radius:8px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">Froid Gerber</h1>
    <p style="margin:4px 0 0;opacity:0.85">Récapitulatif semaine ${semNum}</p>
  </div>

  <h2 style="font-size:16px;color:#0B5FA5">Synthèse équipe</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px">
    <thead>
      <tr style="background:#F2F5F7">
        <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Technicien</th>
        <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Total</th>
        <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Clients</th>
      </tr>
    </thead>
    <tbody>${tableauEquipe}</tbody>
  </table>

  ${sections}

  <p style="font-size:12px;color:#4A6270;border-top:1px solid #D3DDE3;padding-top:16px;margin-top:32px">
    Rapport généré automatiquement — Froid Gerber Pointage
  </p>
</body>
</html>`
}

export async function envoyerRapport(
  semaineIso: string,
  donnees: DonneesTechnicien[],
  pdfBuffer: Buffer
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const destinataires = (process.env.RAPPORT_DESTINATAIRES ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (destinataires.length === 0) {
    console.warn('[rapport] Aucun destinataire configuré (RAPPORT_DESTINATAIRES vide)')
    return
  }

  const htmlContent = genererHtmlRapport(semaineIso, donnees)
  const semNum = semaineIso.split('-W')[1]

  if (!apiKey) {
    console.warn('[rapport] RESEND_API_KEY manquant — email non envoyé (mode dev)')
    console.log('[rapport] Destinataires:', destinataires)
    console.log('[rapport] PDF généré:', pdfBuffer.length, 'bytes')
    return
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  await resend.emails.send({
    from: 'Froid Gerber <noreply@froid-gerber.fr>',
    to: destinataires,
    subject: `Récapitulatif semaine ${semNum} — Froid Gerber`,
    html: htmlContent,
    attachments: [
      {
        filename: `recap-semaine-${semaineIso}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}
