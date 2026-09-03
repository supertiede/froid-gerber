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

  const [intervention, modifications] = await Promise.all([
    prisma.intervention.findUnique({ where: { id }, include: { client: true } }),
    prisma.modification.findMany({
      where: { entite: 'Intervention', entiteId: id },
      orderBy: { at: 'desc' },
      take: 10,
    }),
  ])

  if (!intervention || intervention.userId !== session.user.id) notFound()

  return (
    <InterventionDetail
      intervention={{
        ...intervention,
        debutAt: intervention.debutAt.toISOString(),
        finAt: intervention.finAt?.toISOString() ?? null,
        createdAt: intervention.createdAt.toISOString(),
        updatedAt: intervention.updatedAt.toISOString(),
        client: intervention.client
          ? {
              id: intervention.client.id,
              nom: intervention.client.nom,
              nomNormalise: intervention.client.nomNormalise,
              actif: intervention.client.actif,
              createdAt: intervention.client.createdAt.toISOString(),
              creeParId: intervention.client.creeParId,
            }
          : null,
      }}
      modifications={modifications.map(m => ({
        ...m,
        at: m.at.toISOString(),
      }))}
    />
  )
}
