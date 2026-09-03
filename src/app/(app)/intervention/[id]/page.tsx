import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { InterventionDetail } from '@/components/intervention/InterventionDetail'

export default async function InterventionDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  const [intervention, auditLogs] = await Promise.all([
    prisma.intervention.findUnique({ where: { id }, include: { client: true } }),
    prisma.auditLog.findMany({
      where: { entity: 'Intervention', entityId: id },
      orderBy: { at: 'desc' },
      take: 10,
    }),
  ])

  if (!intervention || intervention.userId !== session.user.id) notFound()

  return (
    <InterventionDetail
      intervention={{
        id: intervention.id,
        type: intervention.type,
        startAt: intervention.startAt.toISOString(),
        endAt: intervention.endAt?.toISOString() ?? null,
        travelMinutes: intervention.travelMinutes,
        workReport: intervention.workReport,
        origin: intervention.origin,
        createdAt: intervention.createdAt.toISOString(),
        updatedAt: intervention.updatedAt.toISOString(),
        client: intervention.client ? {
          id: intervention.client.id,
          name: intervention.client.name,
          normalizedName: intervention.client.normalizedName,
          active: intervention.client.active,
          createdAt: intervention.client.createdAt.toISOString(),
          createdById: intervention.client.createdById,
        } : null,
      }}
      auditLogs={auditLogs.map(log => ({
        id: log.id,
        field: log.field,
        oldValue: log.oldValue,
        newValue: log.newValue,
        at: log.at.toISOString(),
      }))}
    />
  )
}
