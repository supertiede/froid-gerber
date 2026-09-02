'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { pointageManuel } from '@/actions/pointage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TypeSaisie = 'ARRIVEE' | 'DEPART' | 'PAUSE' | null

export default function OubliPage() {
  const router = useRouter()
  const [typeSaisie, setTypeSaisie] = useState<TypeSaisie>(null)
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [typePause, setTypePause] = useState<'DEJEUNER' | 'COURTE'>('COURTE')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [succes, setSucces] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErreur('')

    if (!typeSaisie) return

    const cleClient = uuidv4()
    const result = await pointageManuel({
      type: typeSaisie,
      heureDebut: new Date(heureDebut).toISOString(),
      heureFin: typeSaisie === 'PAUSE' && heureFin ? new Date(heureFin).toISOString() : undefined,
      typePause: typeSaisie === 'PAUSE' ? typePause : undefined,
      cleClient,
    })

    setLoading(false)

    if (!result.ok) {
      setErreur(result.error)
    } else {
      setSucces(true)
      setTimeout(() => router.push('/'), 1500)
    }
  }

  const btnType = (label: string, type: TypeSaisie) => (
    <button
      type="button"
      onClick={() => { setTypeSaisie(type); setErreur('') }}
      style={{
        flex: 1,
        height: 64,
        borderRadius: 12,
        background: typeSaisie === type ? 'var(--acier)' : 'transparent',
        color: typeSaisie === type ? '#fff' : 'var(--acier)',
        fontSize: 15,
        fontWeight: 600,
        border: '2px solid var(--acier)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  if (succes) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--vert)', fontSize: 20, fontWeight: 600 }}>
        Pointage enregistré !
      </div>
    )
  }

  return (
    <div style={{ padding: 24, color: 'var(--encre)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
        Saisie manuelle
      </h1>
      <p style={{ fontSize: 15, color: 'var(--encre-douce)', marginBottom: 24 }}>
        Corrigez ou complétez un pointage oublié (7 jours max).
      </p>

      {/* Sélection du type */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {btnType('Arrivée', 'ARRIVEE')}
        {btnType('Départ', 'DEPART')}
        {btnType('Pause', 'PAUSE')}
      </div>

      {typeSaisie && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={{ fontSize: 16 }}>
              {typeSaisie === 'PAUSE' ? 'Début de la pause' : 'Heure'}
            </Label>
            <Input
              type="datetime-local"
              value={heureDebut}
              onChange={e => setHeureDebut(e.target.value)}
              required
              style={{ height: 56, fontSize: 16 }}
            />
          </div>

          {typeSaisie === 'PAUSE' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label style={{ fontSize: 16 }}>Fin de la pause</Label>
                <Input
                  type="datetime-local"
                  value={heureFin}
                  onChange={e => setHeureFin(e.target.value)}
                  required
                  style={{ height: 56, fontSize: 16 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setTypePause('COURTE')}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 8,
                    background: typePause === 'COURTE' ? 'var(--ambre)' : 'transparent',
                    color: typePause === 'COURTE' ? '#fff' : 'var(--ambre)',
                    fontSize: 15,
                    fontWeight: 600,
                    border: '2px solid var(--ambre)',
                    cursor: 'pointer',
                  }}
                >
                  Courte
                </button>
                <button
                  type="button"
                  onClick={() => setTypePause('DEJEUNER')}
                  style={{
                    flex: 1,
                    height: 56,
                    borderRadius: 8,
                    background: typePause === 'DEJEUNER' ? 'var(--ambre)' : 'transparent',
                    color: typePause === 'DEJEUNER' ? '#fff' : 'var(--ambre)',
                    fontSize: 15,
                    fontWeight: 600,
                    border: '2px solid var(--ambre)',
                    cursor: 'pointer',
                  }}
                >
                  Déjeuner
                </button>
              </div>
            </>
          )}

          {erreur && (
            <p style={{ color: 'var(--rouge)', fontSize: 15 }}>{erreur}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            style={{
              height: 64,
              fontSize: 18,
              fontWeight: 600,
              background: 'var(--acier)',
              color: '#fff',
              borderRadius: 12,
            }}
          >
            {loading ? 'Enregistrement…' : 'ENREGISTRER'}
          </Button>
        </form>
      )}
    </div>
  )
}
