import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { InterventionView } from '@/components/intervention/InterventionView'

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

  const title = intervention.type === 'WORKSHOP' ? 'Atelier' : intervention.client?.name ?? '—'

  return (
    <InterventionView
      interventionId={intervention.id}
      title={title}
      startAt={intervention.startAt.toISOString()}
      endAt={intervention.endAt?.toISOString() ?? null}
      pauseMinutes={intervention.pauseMinutes ?? 0}
      workReport={intervention.workReport ?? ''}
    />
  )
}
