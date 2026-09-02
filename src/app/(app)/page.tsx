import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { debutJourneeParis, finJourneeParis, maintenant } from '@/lib/temps'
import { calculerEtat } from '@/lib/etat-journee'
import { EcranJournee } from '@/components/journee/EcranJournee'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  // Redirect to password change if needed
  if (session.user.doitChangerMotDePasse) {
    redirect('/changer-mot-de-passe')
  }

  const userId = session.user.id
  const now = maintenant()
  const debut = debutJourneeParis(now)
  const fin = finJourneeParis(now)

  const [poste, interventionEnCours] = await Promise.all([
    prisma.poste.findFirst({
      where: { userId, debutAt: { gte: debut, lte: fin } },
      include: { pauses: true },
      orderBy: { debutAt: 'desc' },
    }),
    prisma.intervention.findFirst({
      where: { userId, finAt: null },
      include: { client: true },
    }),
  ])

  const etat = calculerEtat(poste, interventionEnCours)
  const pauseEnCours = poste?.pauses.find(p => !p.finAt) ?? null

  let debutChronoAt: number | null = null
  if (etat === 'AU_TRAVAIL') debutChronoAt = poste!.debutAt.getTime()
  if (etat === 'EN_PAUSE' || etat === 'PAUSE_DEJEUNER') debutChronoAt = pauseEnCours!.debutAt.getTime()
  if (etat === 'EN_INTERVENTION') debutChronoAt = interventionEnCours!.debutAt.getTime()

  return (
    <EcranJournee
      etat={etat}
      poste={poste ? {
        id: poste.id,
        userId: poste.userId,
        debutAt: poste.debutAt.toISOString(),
        finAt: poste.finAt?.toISOString() ?? null,
        origineDebut: poste.origineDebut,
        origineFin: poste.origineFin,
        cleClient: poste.cleClient,
        createdAt: poste.createdAt.toISOString(),
        updatedAt: poste.updatedAt.toISOString(),
        pauses: poste.pauses.map(p => ({
          id: p.id,
          posteId: p.posteId,
          type: p.type,
          debutAt: p.debutAt.toISOString(),
          finAt: p.finAt?.toISOString() ?? null,
          origineDebut: p.origineDebut,
          origineFin: p.origineFin,
          cleClient: p.cleClient,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      } : null}
      interventionEnCours={interventionEnCours ? {
        id: interventionEnCours.id,
        userId: interventionEnCours.userId,
        type: interventionEnCours.type,
        clientId: interventionEnCours.clientId,
        debutAt: interventionEnCours.debutAt.toISOString(),
        finAt: interventionEnCours.finAt?.toISOString() ?? null,
        trajetMinutes: interventionEnCours.trajetMinutes,
        compteRendu: interventionEnCours.compteRendu,
        origine: interventionEnCours.origine,
        cleClient: interventionEnCours.cleClient,
        createdAt: interventionEnCours.createdAt.toISOString(),
        updatedAt: interventionEnCours.updatedAt.toISOString(),
        client: interventionEnCours.client ? {
          id: interventionEnCours.client.id,
          nom: interventionEnCours.client.nom,
        } : null,
      } : null}
      pauseEnCours={pauseEnCours ? {
        id: pauseEnCours.id,
        posteId: pauseEnCours.posteId,
        type: pauseEnCours.type,
        debutAt: pauseEnCours.debutAt.toISOString(),
        finAt: pauseEnCours.finAt?.toISOString() ?? null,
        origineDebut: pauseEnCours.origineDebut,
        origineFin: pauseEnCours.origineFin,
        cleClient: pauseEnCours.cleClient,
        createdAt: pauseEnCours.createdAt.toISOString(),
        updatedAt: pauseEnCours.updatedAt.toISOString(),
      } : null}
      debutChronoAt={debutChronoAt}
      userName={session.user.name}
    />
  )
}
