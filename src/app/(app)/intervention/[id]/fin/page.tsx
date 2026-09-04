import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { WorkReportForm } from '@/components/intervention/WorkReportForm'
import { InterventionTimesEditor } from '@/components/intervention/InterventionTimesEditor'

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

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>
          {intervention.type === 'WORKSHOP' ? 'Atelier' : intervention.client?.name}
        </h1>
        {intervention.endAt && (
          <InterventionTimesEditor
            interventionId={id}
            startAt={intervention.startAt.toISOString()}
            endAt={intervention.endAt.toISOString()}
          />
        )}
      </div>
      <WorkReportForm interventionId={id} workReport={intervention.workReport ?? ''} />
    </div>
  )
}
