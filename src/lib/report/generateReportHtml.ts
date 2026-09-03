import type { TechnicianData } from '@/types/TechnicianData'
import { formatDuration } from '@/lib/time/formatDuration'

export function generateReportHtml(isoWeek: string, data: TechnicianData[]): string {
  const weekNum = isoWeek.split('-W')[1]

  const teamRows = data.map(tech => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3">${tech.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3;font-weight:600">${formatDuration(tech.weekTotalMinutes)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #D3DDE3">${tech.hoursByClient.length} clients</td>
    </tr>
  `).join('')

  const sections = data.map(tech => {
    const daysHtml = tech.daysData.map(day => {
      const intervRows = day.interventions.map(i => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.startTime}${i.endTime ? ` → ${i.endTime}` : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.clientName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.durationMinutes !== null ? formatDuration(i.durationMinutes) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${i.travelMinutes > 0 ? formatDuration(i.travelMinutes * 2) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;font-weight:600">${i.totalMinutes !== null ? formatDuration(i.totalMinutes) : '—'}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;color:#4A6270">${i.workReport ?? ''}</td>
        </tr>
      `).join('')

      const anomaliesHtml = day.anomalies.length > 0
        ? `<p style="color:#A32B24;font-size:13px;margin:4px 0">⚠ ${day.anomalies.join(' — ')}</p>`
        : ''

      return `
        <div style="margin-bottom:24px">
          <div style="background:#F2F5F7;padding:8px 12px;border-left:4px solid #0B5FA5;margin-bottom:8px">
            <strong style="font-size:15px">${day.dayLabel}</strong>
            <span style="float:right;font-weight:700">${formatDuration(day.workedMinutes)}</span>
          </div>
          ${day.arrival ? `<p style="font-size:13px;color:#4A6270;margin:4px 0">Arrivée ${day.arrival}${day.departure ? ` — Départ ${day.departure}` : ' (poste ouvert)'}${day.lunchBreakLabel ? ` — Déjeuner ${day.lunchBreakLabel}` : ''}</p>` : ''}
          ${day.interventions.length > 0 ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px">
              <thead><tr style="background:#F2F5F7">
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Heures</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Client</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Durée</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Trajet A/R</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Total</th>
                <th style="padding:6px 8px;font-size:12px;text-align:left;color:#4A6270">Compte rendu</th>
              </tr></thead>
              <tbody>${intervRows}</tbody>
            </table>
          ` : '<p style="font-size:13px;color:#4A6270;margin:4px 0">Aucune intervention</p>'}
          ${anomaliesHtml}
        </div>
      `
    }).join('')

    const clientsHtml = tech.hoursByClient.map(hpc => `
      <tr>
        <td style="padding:4px 8px;font-size:13px">${hpc.clientName}</td>
        <td style="padding:4px 8px;font-size:13px;font-weight:600;text-align:right">${formatDuration(hpc.totalMinutes)}</td>
      </tr>
    `).join('')

    return `
      <div style="margin-bottom:40px;page-break-inside:avoid">
        <h2 style="font-size:18px;color:#0B5FA5;border-bottom:2px solid #0B5FA5;padding-bottom:8px">
          ${tech.name} — ${formatDuration(tech.weekTotalMinutes)}
        </h2>
        ${tech.hoursByClient.length > 0 ? `<table width="200" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px"><tbody>${clientsHtml}</tbody></table>` : ''}
        ${daysHtml}
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#10202B;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#0B5FA5;color:#fff;padding:20px;border-radius:8px;margin-bottom:24px">
    <h1 style="margin:0;font-size:20px">Froid Gerber</h1>
    <p style="margin:4px 0 0;opacity:0.85">Récapitulatif semaine ${weekNum}</p>
  </div>
  <h2 style="font-size:16px;color:#0B5FA5">Synthèse équipe</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:32px">
    <thead><tr style="background:#F2F5F7">
      <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Technicien</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Total</th>
      <th style="padding:8px 12px;text-align:left;font-size:13px;color:#4A6270">Clients</th>
    </tr></thead>
    <tbody>${teamRows}</tbody>
  </table>
  ${sections}
  <p style="font-size:12px;color:#4A6270;border-top:1px solid #D3DDE3;padding-top:16px;margin-top:32px">
    Rapport généré automatiquement — Froid Gerber Pointage
  </p>
</body>
</html>`
}
