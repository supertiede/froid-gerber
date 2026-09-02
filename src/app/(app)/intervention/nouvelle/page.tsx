'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { demarrerIntervention } from '@/actions/interventions'
import { chercherClients, creerClient } from '@/actions/clients'

type ClientRow = {
  id: string
  nom: string
  nomNormalise: string
  actif: boolean
  createdAt: Date
  creeParId: string | null
}

const PRESETS_TRAJET = [5, 10, 15, 20, 30]

export default function NouvelleInterventionPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Client selection
  const [typeChoisi, setTypeChoisi] = useState<'ATELIER' | 'CLIENT' | null>(null)
  const [clientChoisi, setClientChoisi] = useState<ClientRow | null>(null)
  const [query, setQuery] = useState('')
  const [resultats, setResultats] = useState<ClientRow[]>([])
  const [suggestion, setSuggestion] = useState<string | null>(null)

  // Trajet
  const [trajet, setTrajet] = useState<number>(0)
  const [trajetCustom, setTrajetCustom] = useState('')

  const [error, setError] = useState('')

  useEffect(() => {
    if (!query || query.length < 2) {
      setResultats([])
      setSuggestion(null)
      return
    }
    const timer = setTimeout(async () => {
      const clients = await chercherClients(query)
      setResultats(clients)
      if (clients.length === 0) setSuggestion(query)
      else setSuggestion(null)
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  async function handleAddClient() {
    if (!suggestion) return
    const result = await creerClient(suggestion)
    if (result.ok) {
      setClientChoisi(result.data)
      setTypeChoisi('CLIENT')
      setQuery('')
      setResultats([])
      setSuggestion(null)
    }
  }

  function handleDemarrer() {
    if (!typeChoisi) return
    setError('')

    const trajetFinal = typeChoisi === 'ATELIER' ? 0 :
      trajetCustom ? parseInt(trajetCustom, 10) : trajet

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

  const peutDemarrer = typeChoisi !== null && (typeChoisi === 'ATELIER' || clientChoisi !== null)

  return (
    <div style={{ paddingBottom: 100 }}>
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

          {/* Search field */}
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setClientChoisi(null)
              setTypeChoisi(null)
            }}
            placeholder="Chercher un client…"
            style={{
              width: '100%',
              height: 56,
              border: '1px solid var(--trait)',
              borderRadius: 8,
              padding: '0 16px',
              fontSize: 18,
              color: 'var(--encre)',
              background: 'var(--surface)',
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />

          {/* ATELIER button — always shown first */}
          <button
            onClick={() => { setTypeChoisi('ATELIER'); setClientChoisi(null); setQuery('') }}
            style={{
              width: '100%',
              height: 64,
              border: `2px solid ${typeChoisi === 'ATELIER' ? 'var(--acier)' : 'var(--trait)'}`,
              borderRadius: 8,
              background: typeChoisi === 'ATELIER' ? 'rgba(11,95,165,0.08)' : 'var(--surface)',
              color: 'var(--encre)',
              fontSize: 18,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 16px',
              marginBottom: 12,
              cursor: 'pointer',
            }}
          >
            🔧 ATELIER
          </button>

          {/* Search results */}
          {resultats.map(client => (
            <button
              key={client.id}
              onClick={() => { setClientChoisi(client); setTypeChoisi('CLIENT'); setQuery(client.nom) }}
              style={{
                width: '100%',
                height: 56,
                border: `2px solid ${clientChoisi?.id === client.id ? 'var(--acier)' : 'var(--trait)'}`,
                borderRadius: 8,
                background: clientChoisi?.id === client.id ? 'rgba(11,95,165,0.08)' : 'var(--surface)',
                color: 'var(--encre)',
                fontSize: 18,
                textAlign: 'left',
                padding: '0 16px',
                marginBottom: 8,
                cursor: 'pointer',
              }}
            >
              {client.nom}
            </button>
          ))}

          {/* Add new client suggestion */}
          {suggestion && (
            <button
              onClick={handleAddClient}
              style={{
                width: '100%',
                height: 56,
                border: '2px dashed var(--trait)',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--acier)',
                fontSize: 16,
                textAlign: 'left',
                padding: '0 16px',
                cursor: 'pointer',
              }}
            >
              + Ajouter « {suggestion} » comme nouveau client
            </button>
          )}

          {/* Selected client display */}
          {clientChoisi && typeChoisi === 'CLIENT' && (
            <div style={{ padding: '8px 0', fontSize: 16, color: 'var(--vert)' }}>
              ✓ {clientChoisi.nom} sélectionné
            </div>
          )}
        </section>

        {/* Section: Trajet (only for CLIENT) */}
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
      <div style={{
        position: 'fixed',
        bottom: 80,
        left: 16,
        right: 16,
      }}>
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
          }}
        >
          {isPending ? 'Démarrage…' : 'DÉMARRER L\'INTERVENTION'}
        </button>
      </div>
    </div>
  )
}
