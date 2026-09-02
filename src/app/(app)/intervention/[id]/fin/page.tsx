import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { CompteRenduForm } from '@/components/intervention/CompteRenduForm'
import { formatHeure, diffMinutes, formatDuree } from '@/lib/temps'

export default async function FinInterventionPage({
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

  const dureeMinutes = intervention.finAt
    ? diffMinutes(intervention.debutAt, intervention.finAt)
    : null

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>
          {intervention.type === 'ATELIER' ? 'Atelier' : intervention.client?.nom}
        </h1>
        {dureeMinutes !== null && (
          <p style={{ fontSize: 18, color: 'var(--encre-douce)', marginTop: 4 }}>
            {formatDuree(dureeMinutes)}
            {intervention.finAt && ` · ${formatHeure(intervention.debutAt)} → ${formatHeure(intervention.finAt)}`}
          </p>
        )}
      </div>
      <CompteRenduForm interventionId={id} compteRenduActuel={intervention.compteRendu ?? ''} />
    </div>
  )
}
