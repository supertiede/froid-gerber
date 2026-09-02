import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { formatHeure, formatDuree, diffMinutes } from '@/lib/temps'
import { tempsInterventionMinutes } from '@/lib/calculs'
import Link from 'next/link'

export default async function InterventionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const intervention = await prisma.intervention.findUnique({
    where: { id },
    include: { client: true },
  })

  if (!intervention || intervention.userId !== session.user.id) notFound()

  const dureeMinutes = intervention.finAt ? diffMinutes(intervention.debutAt, intervention.finAt) : null
  const totalMinutes = intervention.finAt ? tempsInterventionMinutes(intervention) : null

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/interventions" style={{ fontSize: 24, color: 'var(--encre)', textDecoration: 'none' }}>←</Link>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>
          {intervention.type === 'ATELIER' ? 'Atelier' : intervention.client?.nom}
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <InfoRow label="Début" value={formatHeure(intervention.debutAt)} />
        {intervention.finAt && <InfoRow label="Fin" value={formatHeure(intervention.finAt)} />}
        {dureeMinutes !== null && <InfoRow label="Durée" value={formatDuree(dureeMinutes)} />}
        {intervention.trajetMinutes > 0 && (
          <InfoRow label="Trajet (A/R)" value={formatDuree(2 * intervention.trajetMinutes)} />
        )}
        {totalMinutes !== null && <InfoRow label="Total" value={formatDuree(totalMinutes)} />}
        {intervention.compteRendu && (
          <InfoRow label="Compte rendu" value={intervention.compteRendu} />
        )}
        {!intervention.compteRendu && intervention.finAt && (
          <Link
            href={`/intervention/${id}/fin`}
            style={{
              display: 'block',
              height: 64,
              lineHeight: '64px',
              textAlign: 'center',
              borderRadius: 12,
              border: '2px solid var(--acier)',
              color: 'var(--acier)',
              fontSize: 18,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ajouter un compte rendu
          </Link>
        )}
        {intervention.origine === 'MANUEL' && (
          <p style={{ fontSize: 13, color: 'var(--encre-douce)' }}>Saisie manuelle</p>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid var(--trait)',
      minHeight: 56,
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 15, color: 'var(--encre-douce)' }}>{label}</span>
      <span style={{ fontSize: 18, color: 'var(--encre)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
