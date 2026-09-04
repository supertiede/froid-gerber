'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Info } from 'lucide-react'
import { startIntervention } from '@/actions/intervention/startIntervention'
import { getAllClients } from '@/actions/client/getAllClients'
import { ClientSearchModal } from '@/components/intervention/ClientSearchModal'
import { Modal } from '@/components/ui/Modal'

type Client = { id: string; name: string; normalizedName: string }

const TRAVEL_PRESETS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120]

export default function NouvelleInterventionPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [selectedType, setSelectedType] = useState<'WORKSHOP' | 'CLIENT' | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  const [travel, setTravel] = useState(0)
  const [travelInfoOpen, setTravelInfoOpen] = useState(false)
  const [error, setError] = useState('')

  async function openModal() {
    setModalOpen(true)
    if (clients.length === 0) {
      setLoadingClients(true)
      const list = await getAllClients()
      setClients(list)
      setLoadingClients(false)
    }
  }

  function handleSelect(selection: Client | 'WORKSHOP') {
    setModalOpen(false)
    if (selection === 'WORKSHOP') {
      setSelectedType('WORKSHOP')
      setSelectedClient(null)
    } else {
      setSelectedType('CLIENT')
      setSelectedClient(selection)
    }
  }

  function handleStart() {
    if (!selectedType) return
    setError('')
    const travelFinal = selectedType === 'WORKSHOP' ? 0 : travel

    startTransition(async () => {
      const result = await startIntervention({
        type: selectedType,
        clientId: selectedClient?.id,
        travelMinutes: travelFinal,
        idempotencyKey: uuidv4(),
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

  const canStart = selectedType !== null

  return (
    <div style={{ paddingBottom: 120 }}>
      {modalOpen && (
        <ClientSearchModal
          clients={clients}
          onSelect={handleSelect}
          onClose={() => setModalOpen(false)}
        />
      )}

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
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 12 }}>
            Chez qui ?
          </h2>

          {selectedType ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              height: 64,
              borderRadius: 10,
              border: '2px solid var(--bleu-ciel)',
              background: 'rgba(11,95,165,0.06)',
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--encre)' }}>
                {selectedType === 'WORKSHOP' ? '🔧 Atelier' : selectedClient?.name}
              </span>
              <button
                onClick={() => { setSelectedType(null); setSelectedClient(null); openModal() }}
                style={{ fontSize: 15, color: 'var(--bleu-ciel)', background: 'none', border: 'none', minHeight: 'auto', padding: '4px 8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Changer
              </button>
            </div>
          ) : (
            <button
              onClick={openModal}
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
                {loadingClients ? 'Chargement…' : "Choisir un client ou l'atelier…"}
              </span>
            </button>
          )}
        </section>

        {selectedType === 'CLIENT' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', margin: 0 }}>
                Durée du trajet (aller)
              </h2>
              <button
                onClick={() => setTravelInfoOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  minHeight: 'unset',
                  borderRadius: '50%',
                  border: '1.5px solid var(--trait)',
                  background: 'transparent',
                  color: 'var(--encre-douce)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Comment est calculé le temps de trajet ?"
              >
                <Info size={14} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TRAVEL_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => setTravel(p)}
                  style={{
                    height: 64,
                    border: `2px solid ${travel === p ? 'var(--bleu-ciel)' : 'var(--trait)'}`,
                    borderRadius: 10,
                    background: travel === p ? 'rgba(11,95,165,0.08)' : 'var(--surface)',
                    color: 'var(--encre)',
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p < 60 ? `${p} min` : `${p / 60}h`}
                </button>
              ))}
            </div>

            <Modal
              open={travelInfoOpen}
              onOpenChange={setTravelInfoOpen}
              title="Calcul du temps de trajet"
            >
              <p style={{ marginBottom: 12 }}>
                Vous saisissez la durée du trajet <strong style={{ color: 'var(--encre)' }}>aller</strong> (atelier → client).
              </p>
              <p style={{ marginBottom: 16 }}>
                Le temps de trajet total (aller + retour) est calculé automatiquement en multipliant cette valeur par 2, et s&apos;ajoute à la durée de l&apos;intervention.
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(11,95,165,0.07)',
                border: '1px solid rgba(11,95,165,0.2)',
                fontSize: 14,
                color: 'var(--bleu-ciel)',
                fontWeight: 500,
              }}>
                Temps total = intervention + (trajet aller × 2)
              </div>
            </Modal>
          </section>
        )}

        {error && <p style={{ color: 'var(--rouge)', fontSize: 15 }}>{error}</p>}
      </div>

      <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16 }}>
        <button
          onClick={handleStart}
          disabled={!canStart || isPending}
          style={{
            width: '100%',
            height: 96,
            borderRadius: 12,
            background: canStart ? 'var(--bleu-ciel)' : 'var(--trait)',
            color: canStart ? '#fff' : 'var(--encre-douce)',
            fontSize: 20,
            fontWeight: 600,
            border: 'none',
            cursor: canStart ? 'pointer' : 'not-allowed',
            transition: 'background 200ms',
          }}
        >
          {isPending ? 'Démarrage…' : 'DÉMARRER'}
        </button>
      </div>
    </div>
  )
}
