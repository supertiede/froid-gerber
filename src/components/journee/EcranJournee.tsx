'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { BandeauEtat } from './BandeauEtat'
import { BandeauAnnulation } from './BandeauAnnulation'
import {
  arriver,
  annulerArrivee,
  demarrerPause,
  annulerPause,
  reprendreTravail,
  terminerJournee,
  annulerFinJournee,
  reprendreJournee,
} from '@/actions/pointage'
import { terminerIntervention } from '@/actions/interventions'
import type { EtatJournee } from '@/lib/etat-journee'
import { formatHeure, formatDuree } from '@/lib/temps'
import { dureePausesMinutes } from '@/lib/calculs'

// Serialized types (dates as ISO strings for client components)
type PauseClient = {
  id: string
  posteId: string
  type: string
  debutAt: string
  finAt: string | null
  origineDebut: string
  origineFin: string | null
  cleClient: string | null
  createdAt: string
  updatedAt: string
}

type PosteClient = {
  id: string
  userId: string
  debutAt: string
  finAt: string | null
  origineDebut: string
  origineFin: string | null
  cleClient: string | null
  createdAt: string
  updatedAt: string
  pauses: PauseClient[]
}

type ClientInfo = {
  id: string
  nom: string
} | null

type InterventionClient = {
  id: string
  userId: string
  type: string
  clientId: string | null
  debutAt: string
  finAt: string | null
  trajetMinutes: number
  compteRendu: string | null
  origine: string
  cleClient: string | null
  createdAt: string
  updatedAt: string
  client: ClientInfo
}

type Annulation = {
  message: string
  onAnnuler: () => Promise<void>
}

type Props = {
  etat: EtatJournee
  poste: PosteClient | null
  interventionEnCours: InterventionClient | null
  pauseEnCours: PauseClient | null
  debutChronoAt: number | null
  userName: string
}

function vibrer() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(15)
  }
}

export function EcranJournee({ etat: etatInitial, poste, interventionEnCours, pauseEnCours, debutChronoAt, userName }: Props) {
  const router = useRouter()
  const [etat, setEtat] = useState<EtatJournee>(etatInitial)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [annulation, setAnnulation] = useState<Annulation | null>(null)

  const rafraichir = useCallback(() => {
    router.refresh()
  }, [router])

  async function executer<T>(
    action: () => Promise<{ ok: true } | { ok: true; data: T } | { ok: false; error: string }>,
    etatOptimiste: EtatJournee,
    messageAnnulation: string,
    actionAnnulation: () => Promise<void>,
  ) {
    if (loading) return
    vibrer()
    setLoading(true)
    setErreur(null)
    setEtat(etatOptimiste)

    const result = await action()

    if (!result.ok) {
      setErreur((result as { ok: false; error: string }).error)
      setEtat(etatInitial)
    } else {
      setAnnulation({
        message: messageAnnulation,
        onAnnuler: async () => {
          setAnnulation(null)
          await actionAnnulation()
          rafraichir()
        },
      })
    }

    setLoading(false)
    rafraichir()
  }

  function arriveeLabel(): string {
    if (!poste) return ''
    const parties = [`Arrivé ${formatHeure(new Date(poste.debutAt))}`]
    const pauses = poste.pauses.filter(p => p.finAt)
    if (pauses.length > 0) {
      const dureePauses = dureePausesMinutes(
        pauses.map(p => ({ debutAt: new Date(p.debutAt), finAt: p.finAt ? new Date(p.finAt) : null }))
      )
      if (dureePauses > 0) parties.push(`Pause ${formatDuree(dureePauses)}`)
    }
    return parties.join(' · ')
  }

  const handleArriver = async () => {
    const cleClient = uuidv4()
    await executer(
      () => arriver(cleClient),
      'AU_TRAVAIL',
      `Arrivée enregistrée à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      async () => {
        const p = await prismaDeletePoste(cleClient)
        if (p?.id) await annulerArrivee(p.id)
      },
    )
  }

  const handlePauseDejeuner = async () => {
    const cleClient = uuidv4()
    await executer(
      () => demarrerPause('DEJEUNER', cleClient),
      'PAUSE_DEJEUNER',
      'Pause déjeuner démarrée',
      async () => {
        if (pauseEnCoursRef.current?.id) await annulerPause(pauseEnCoursRef.current.id)
      },
    )
  }

  const handlePauseCourte = async () => {
    const cleClient = uuidv4()
    await executer(
      () => demarrerPause('COURTE', cleClient),
      'EN_PAUSE',
      'Pause démarrée',
      async () => {
        if (pauseEnCoursRef.current?.id) await annulerPause(pauseEnCoursRef.current.id)
      },
    )
  }

  const handleReprendreTravail = async () => {
    const cleClient = uuidv4()
    await executer(
      () => reprendreTravail(cleClient),
      'AU_TRAVAIL',
      'Reprise du travail enregistrée',
      async () => {
        // Re-open the pause (no-op for now, page refresh will show it)
        rafraichir()
      },
    )
  }

  const handleTerminerJournee = async () => {
    const cleClient = uuidv4()
    const posteId = poste?.id
    await executer(
      () => terminerJournee(cleClient),
      'JOURNEE_TERMINEE',
      `Journée terminée à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      async () => {
        if (posteId) await annulerFinJournee(posteId)
      },
    )
  }

  const handleReprendreJournee = async () => {
    const cleClient = uuidv4()
    await executer(
      () => reprendreJournee(cleClient),
      'AU_TRAVAIL',
      'Journée reprise',
      async () => { rafraichir() },
    )
  }

  // Ref trick for cancelable pause — simplified: use server re-read
  const pauseEnCoursRef = { current: pauseEnCours }

  const btnPrimaire = (label: string, onClick: () => void | Promise<void>, couleur?: string) => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: 'calc(100% - 32px)',
        height: 96,
        margin: '0 16px',
        borderRadius: 12,
        background: couleur ?? 'var(--acier)',
        color: '#fff',
        fontSize: 20,
        fontWeight: 600,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </button>
  )

  const btnSecondaire = (label: string, onClick: () => void | Promise<void>, couleur?: string) => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1,
        height: 64,
        borderRadius: 12,
        background: 'transparent',
        color: couleur ?? 'var(--acier)',
        fontSize: 15,
        fontWeight: 600,
        border: `2px solid ${couleur ?? 'var(--acier)'}`,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  )

  const clientNom = interventionEnCours?.client?.nom

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fond)' }}>
      {/* En-tête avec nom utilisateur */}
      <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, color: 'var(--encre-douce)', fontWeight: 500 }}>
          Bonjour, {userName}
        </span>
      </div>

      {/* Bandeau état */}
      <BandeauEtat
        etat={etat}
        clientNom={clientNom}
        debutChronoAt={debutChronoAt}
        arriveeLabel={poste ? arriveeLabel() : undefined}
      />

      {/* Zone des boutons */}
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erreur && (
          <div style={{
            margin: '0 16px',
            padding: '12px 16px',
            background: 'rgba(163,43,36,0.1)',
            border: '1px solid var(--rouge)',
            borderRadius: 8,
            color: 'var(--rouge)',
            fontSize: 15,
          }}>
            {erreur}
          </div>
        )}

        {etat === 'HORS_POSTE' && (
          <>
            {btnPrimaire('JE SUIS ARRIVÉ', handleArriver, 'var(--vert)')}
            <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
              {btnSecondaire("Démarrer une intervention", () => router.push('/intervention/nouvelle'), 'var(--cuivre)')}
              {btnSecondaire("J'ai oublié de pointer", () => router.push('/oubli'))}
            </div>
          </>
        )}

        {etat === 'AU_TRAVAIL' && (
          <>
            {btnPrimaire("DÉMARRER UNE INTERVENTION", () => router.push('/intervention/nouvelle'), 'var(--cuivre)')}
            <div style={{ display: 'flex', gap: 12, padding: '0 16px' }}>
              {btnSecondaire('Pause déjeuner', handlePauseDejeuner, 'var(--ambre)')}
              {btnSecondaire('Faire une pause', handlePauseCourte, 'var(--ambre)')}
            </div>
            <div style={{ padding: '0 16px' }}>
              {btnSecondaire('Fin de journée', handleTerminerJournee, 'var(--gris-etat)')}
            </div>
          </>
        )}

        {(etat === 'PAUSE_DEJEUNER' || etat === 'EN_PAUSE') && (
          <>
            {btnPrimaire('REPRENDRE LE TRAVAIL', handleReprendreTravail, 'var(--vert)')}
          </>
        )}

        {etat === 'EN_INTERVENTION' && (
          <>
            {btnPrimaire('TERMINER L\'INTERVENTION', async () => {
              if (!interventionEnCours) return
              vibrer()
              setLoading(true)
              const result = await terminerIntervention(interventionEnCours.id)
              setLoading(false)
              if (result.ok) {
                router.push(`/intervention/${interventionEnCours.id}/fin`)
              } else {
                setErreur((result as { ok: false; error: string }).error)
              }
            }, 'var(--cuivre)')}
            <div style={{ padding: '0 16px' }}>
              {btnSecondaire('Faire une pause', handlePauseCourte, 'var(--ambre)')}
            </div>
          </>
        )}

        {etat === 'JOURNEE_TERMINEE' && (
          <>
            {btnPrimaire('REPRENDRE LE TRAVAIL', handleReprendreJournee, 'var(--vert)')}
            <div style={{ padding: '0 16px' }}>
              {btnSecondaire('Voir ma journée', () => router.push('/semaine'))}
            </div>
          </>
        )}
      </div>

      {/* Toast annulation */}
      {annulation && (
        <BandeauAnnulation
          message={annulation.message}
          onAnnuler={annulation.onAnnuler}
          onExpire={() => setAnnulation(null)}
        />
      )}
    </div>
  )
}

// Helper stub for undo — we need the real poste ID from server, use refresh instead
async function prismaDeletePoste(_cleClient: string): Promise<{ id: string } | null> {
  return null
}
