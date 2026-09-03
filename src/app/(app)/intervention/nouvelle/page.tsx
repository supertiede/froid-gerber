'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { demarrerIntervention } from '@/actions/interventions'
import { getTousLesClients } from '@/actions/clients'
import { RechercheClientModal } from '@/components/intervention/RechercheClientModal'

type Client = { id: string; nom: string; nomNormalise: string }

const PRESETS_TRAJET = [5, 10, 15, 20, 30]

export default function NouvelleInterventionPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [typeChoisi, setTypeChoisi] = useState<'ATELIER' | 'CLIENT' | null>(null)
  const [clientChoisi, setClientChoisi] = useState<Client | null>(null)
  const [modalOuverte, setModalOuverte] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  const [trajet, setTrajet] = useState(0)
  const [trajetCustom, setTrajetCustom] = useState('')
  const [error, setError] = useState('')

  async function ouvrirModal() {
    setModalOuverte(true)
    if (clients.length === 0) {
      setLoadingClients(true)
      const list = await getTousLesClients()
      setClients(list)
      setLoadingClients(false)
    }
  }

  function handleSelect(selection: Client | 'ATELIER') {
    setModalOuverte(false)
    if (selection === 'ATELIER') {
      setTypeChoisi('ATELIER')
      setClientChoisi(null)
    } else {
      setTypeChoisi('CLIENT')
      setClientChoisi(selection)
    }
  }

  function handleDemarrer() {
    if (!typeChoisi) return
    setError('')
    const trajetFinal = typeChoisi === 'ATELIER' ? 0 : (trajetCustom ? parseInt(trajetCustom, 10) : trajet)

    startTransition(async () => {
      const result = await demarrerIntervention({
        type: typeChoisi,
        clientId: clientChoisi?.id,
        trajetMinutes: trajetFinal,
        cleClient: uuidv4(),
      })
      if (result.ok) {
        if ('vibrate' in navigator) navigator.vibrate(15)
        router.push('/')
        router.refresh()
      } else {
        setError(result.error ?? 'Erreur lors du démarrage.')
      }
    })
  }

  const peutDemarrer = typeChoisi !== null

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Modal plein écran */}
      {modalOuverte && (
        <RechercheClientModal
          clients={clients}
          onSelect={handleSelect}
          onClose={() => setModalOuverte(false)}
        />
      )}

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ fontSize: 24, background: 'none', border: 'none', color: 'var(--encre)', minHeight: 'auto', padding: 4, cursor: 'pointer' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)' }}>
          Nouvelle intervention
        </h1>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Section: Chez qui ? */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 12 }}>
            Chez qui ?
          </h2>

          {/* Selected state OR search trigger button */}
          {typeChoisi ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              height: 64,
              borderRadius: 10,
              border: '2px solid var(--acier)',
              background: 'rgba(11,95,165,0.06)',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
                {typeChoisi === 'ATELIER' ? '🔧 Atelier' : clientChoisi?.nom}
              </span>
              <button
                onClick={() => { setTypeChoisi(null); setClientChoisi(null); ouvrirModal() }}
                style={{ fontSize: 15, color: 'var(--acier)', background: 'none', border: 'none', minHeight: 'auto', padding: '4px 8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Changer
              </button>
            </div>
          ) : (
            <button
              onClick={ouvrirModal}
              style={{
                width: '100%',
                height: 64,
                borderRadius: 10,
                border: '1.5px solid var(--trait)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 20, color: 'var(--encre-douce)' }}>🔍</span>
              <span style={{ fontSize: 18, color: 'var(--encre-douce)' }}>
                {loadingClients ? 'Chargement…' : 'Choisir un client ou l\'atelier…'}
              </span>
            </button>
          )}
        </section>

        {/* Section: Trajet — only for CLIENT */}
        {typeChoisi === 'CLIENT' && (
          <section>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 12 }}>
              Temps de trajet aller
            </h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {PRESETS_TRAJET.map(p => (
                <button
                  key={p}
                  onClick={() => { setTrajet(p); setTrajetCustom('') }}
                  style={{
                    flex: '1 1 calc(20% - 8px)',
                    height: 64,
                    border: `2px solid ${trajet === p && !trajetCustom ? 'var(--acier)' : 'var(--trait)'}`,
                    borderRadius: 8,
                    background: trajet === p && !trajetCustom ? 'rgba(11,95,165,0.08)' : 'var(--surface)',
                    color: 'var(--encre)',
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p} min
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="Autre : ___ min"
              value={trajetCustom}
              onChange={e => { setTrajetCustom(e.target.value); setTrajet(0) }}
              style={{
                width: '100%',
                height: 56,
                border: '1px solid var(--trait)',
                borderRadius: 8,
                padding: '0 16px',
                fontSize: 18,
                background: 'var(--surface)',
                color: 'var(--encre)',
                boxSizing: 'border-box',
              }}
            />
          </section>
        )}

        {error && <p style={{ color: 'var(--rouge)', fontSize: 15 }}>{error}</p>}
      </div>

      {/* Fixed bottom: DÉMARRER button */}
      <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16 }}>
        <button
          onClick={handleDemarrer}
          disabled={!peutDemarrer || isPending}
          style={{
            width: '100%',
            height: 96,
            borderRadius: 12,
            background: peutDemarrer ? 'var(--acier)' : 'var(--trait)',
            color: peutDemarrer ? '#fff' : 'var(--encre-douce)',
            fontSize: 20,
            fontWeight: 600,
            border: 'none',
            cursor: peutDemarrer ? 'pointer' : 'not-allowed',
            transition: 'background 200ms',
          }}
        >
          {isPending ? 'Démarrage…' : 'DÉMARRER'}
        </button>
      </div>
    </div>
  )
}
