'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { INTERVENTIONS_PAGE_SIZE, type InterventionRow } from '@/lib/interventions/types'

export async function fetchMoreInterventions(cursor: string): Promise<{
  items: InterventionRow[]
  nextCursor: string | null
}> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { items: [], nextCursor: null }

  const items = await prisma.intervention.findMany({
    where: {
      userId: session.user.id,
      startAt: { lt: new Date(cursor) },
    },
    include: { client: true },
    orderBy: { startAt: 'desc' },
    take: INTERVENTIONS_PAGE_SIZE,
  })

  return {
    items: items.map(i => ({
      id: i.id,
      type: i.type as 'CLIENT' | 'WORKSHOP',
      startAt: i.startAt.toISOString(),
      endAt: i.endAt?.toISOString() ?? null,
      travelMinutes: i.travelMinutes,
      workReport: i.workReport,
      client: i.client ? { id: i.client.id, name: i.client.name } : null,
    })),
    nextCursor:
      items.length === INTERVENTIONS_PAGE_SIZE
        ? items[items.length - 1].startAt.toISOString()
        : null,
  }
}
