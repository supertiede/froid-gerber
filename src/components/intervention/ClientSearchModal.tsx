'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Fuse from 'fuse.js'
import { createClient } from '@/actions/client/createClient'

type Client = { id: string; name: string; normalizedName: string }

type Props = {
  clients: Client[]
  onSelect: (client: Client | 'WORKSHOP') => void
  onClose: () => void
}

function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function ClientSearchModal({ clients, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input immediately on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  // Fuse.js instance — fuzzy search with accent-normalized keys
  const fuse = useMemo(() => {
    const clientsNormalises = clients.map(c => ({
      ...c,
      // Add normalized version for better matching
      _name: normaliser(c.name),
    }))
    return new Fuse(clientsNormalises, {
      keys: ['name', '_name'],
      threshold: 0.4,        // tolerates ~2 char differences
      ignoreLocation: true,  // finds substring anywhere in the string
      includeScore: true,
      minMatchCharLength: 1,
    })
  }, [clients])

  // Results: if no query, show all clients; if query, fuzzy-search
  const resultats = useMemo((): Client[] => {
    if (!query.trim()) return clients.slice(0, 30) // show 30 most recent by default
    const normQuery = normaliser(query)
    // Search both original query and normalized query
    const results = fuse.search(normQuery.length >= 2 ? normQuery : query)
    return results.map(r => ({ id: r.item.id, name: r.item.name, normalizedName: r.item.normalizedName }))
  }, [query, fuse, clients])

  // Show "add new" suggestion if no exact match and query is meaningful
  const montrerAjout = query.trim().length >= 2 && !resultats.some(
    c => normaliser(c.name) === normaliser(query.trim())
  )

  async function handleCreer() {
    if (!query.trim()) return
    setIsCreating(true)
    try {
      const result = await createClient(query.trim())
      if (result.ok && result.data) {
        onSelect(result.data)
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    // Full-screen overlay
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--fond)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with search input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--trait)',
        background: 'var(--surface)',
      }}>
        <button
          onClick={onClose}
          style={{
            fontSize: 24,
            background: 'none',
            border: 'none',
            color: 'var(--encre)',
            minHeight: 'auto',
            padding: '4px 8px',
            flexShrink: 0,
            cursor: 'pointer',
          }}
          aria-label="Fermer"
        >
          ←
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Chercher un client…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          style={{
            flex: 1,
            height: 52,
            border: '1.5px solid var(--trait)',
            borderRadius: 10,
            padding: '0 16px',
            fontSize: 18,
            color: 'var(--encre)',
            background: 'var(--fond)',
            outline: 'none',
          }}
        />
        {query.length > 0 && (
          <button
            onClick={() => setQuery('')}
            style={{
              fontSize: 20,
              background: 'none',
              border: 'none',
              color: 'var(--encre-douce)',
              minHeight: 'auto',
              padding: '4px 8px',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            aria-label="Effacer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Scrollable results list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* WORKSHOP — always pinned at top */}
        <button
          onClick={() => onSelect('WORKSHOP')}
          style={{
            width: '100%',
            minHeight: 72,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 20px',
            background: 'var(--surface)',
            border: 'none',
            borderBottom: '1px solid var(--trait)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 28 }}>🔧</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--encre)' }}>Atelier</span>
        </button>

        {/* Separator label */}
        {query.trim() === '' && (
          <div style={{ padding: '10px 20px 6px', fontSize: 12, fontWeight: 700, color: 'var(--encre-douce)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Clients
          </div>
        )}
        {query.trim() !== '' && (
          <div style={{ padding: '10px 20px 6px', fontSize: 12, fontWeight: 700, color: 'var(--encre-douce)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {resultats.length > 0 ? `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}` : 'Aucun résultat'}
          </div>
        )}

        {/* Client results */}
        {resultats.map(client => (
          <button
            key={client.id}
            onClick={() => onSelect(client)}
            style={{
              width: '100%',
              minHeight: 68,
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              background: 'var(--surface)',
              border: 'none',
              borderBottom: '1px solid var(--trait)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, color: 'var(--encre)' }}>{client.name}</span>
          </button>
        ))}

        {/* Add new client suggestion */}
        {montrerAjout && (
          <button
            onClick={handleCreer}
            disabled={isCreating}
            style={{
              width: '100%',
              minHeight: 68,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--trait)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 24, color: 'var(--acier)' }}>+</span>
            <div>
              <div style={{ fontSize: 18, color: 'var(--acier)', fontWeight: 600 }}>
                {isCreating ? 'Création…' : `Ajouter « ${query.trim()} »`}
              </div>
              <div style={{ fontSize: 14, color: 'var(--encre-douce)' }}>Nouveau client</div>
            </div>
          </button>
        )}

        {/* Empty state */}
        {resultats.length === 0 && !montrerAjout && query.trim().length > 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--encre-douce)', fontSize: 16 }}>
            Aucun client trouvé
          </div>
        )}
      </div>
    </div>
  )
}
