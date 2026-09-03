import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { WorkReportForm } from '@/components/intervention/WorkReportForm'
import { formatTime } from '@/lib/time/formatTime'
import { diffMinutes } from '@/lib/time/diffMinutes'
import { formatDuration } from '@/lib/time/formatDuration'

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

  const durationMinutes = intervention.endAt
    ? diffMinutes(intervention.startAt, intervention.endAt)
    : null

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>
          {intervention.type === 'WORKSHOP' ? 'Atelier' : intervention.client?.name}
        </h1>
        {durationMinutes !== null && (
          <p style={{ fontSize: 18, color: 'var(--encre-douce)', marginTop: 4 }}>
            {formatDuration(durationMinutes)}
            {intervention.endAt && ` · ${formatTime(intervention.startAt)} → ${formatTime(intervention.endAt)}`}
          </p>
        )}
      </div>
      <WorkReportForm interventionId={id} workReport={intervention.workReport ?? ''} />
    </div>
  )
}
