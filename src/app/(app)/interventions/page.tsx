import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { InterventionList } from '@/components/intervention/InterventionList'
import { INTERVENTIONS_PAGE_SIZE, type InterventionRow } from '@/lib/interventions/types'

export default async function InterventionsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const interventions = await prisma.intervention.findMany({
    where: { userId: session.user.id },
    include: { client: true },
    orderBy: { startAt: 'desc' },
    take: INTERVENTIONS_PAGE_SIZE,
  })

  const items: InterventionRow[] = interventions.map(i => ({
    id: i.id,
    type: i.type as 'CLIENT' | 'WORKSHOP',
    startAt: i.startAt.toISOString(),
    endAt: i.endAt?.toISOString() ?? null,
    travelMinutes: i.travelMinutes,
    workReport: i.workReport,
    client: i.client ? { id: i.client.id, name: i.client.name } : null,
  }))

  const nextCursor =
    interventions.length === INTERVENTIONS_PAGE_SIZE
      ? interventions[interventions.length - 1].startAt.toISOString()
      : null

  return (
    <div style={{ paddingBottom: 24 }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 600,
        padding: '16px 16px 8px',
        color: 'var(--encre)',
      }}>
        Interventions
      </h1>
      <InterventionList initialItems={items} initialNextCursor={nextCursor} />
    </div>
  )
}
