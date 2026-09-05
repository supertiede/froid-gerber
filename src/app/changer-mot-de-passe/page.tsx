'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setNewPassword } from '@/actions/auth/setNewPassword'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ChangerMotDePassePage() {
  const router = useRouter()
  const [mdp, setMdp] = useState('')
  const [confirm, setConfirm] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mdp !== confirm) { setErreur('Les mots de passe ne correspondent pas.'); return }
    if (mdp.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères.'); return }

    setLoading(true)
    setErreur('')

    const result = await setNewPassword(mdp)

    if (!result.ok) {
      setErreur(result.error)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--fond)',
      }}
    >
      <BrandLogo />

      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          borderRadius: 16,
          padding: '28px 24px',
          border: '1px solid var(--trait)',
          boxShadow: '0 2px 16px rgba(16, 32, 43, 0.08)',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--encre)', marginBottom: 6 }}>
          Choisissez votre mot de passe
        </h1>
        <p style={{ fontSize: 14, color: 'var(--encre-douce)', marginBottom: 24, lineHeight: 1.5 }}>
          Première connexion — définissez un mot de passe personnel.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="mdp" style={{ fontSize: 15, fontWeight: 500 }}>
              Nouveau mot de passe
            </Label>
            <Input
              id="mdp"
              type="password"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              required
              aria-required="true"
              autoComplete="new-password"
              style={{ height: 52, fontSize: 17, padding: '0 16px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="confirm" style={{ fontSize: 15, fontWeight: 500 }}>
              Confirmer
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              aria-required="true"
              autoComplete="new-password"
              style={{ height: 52, fontSize: 17, padding: '0 16px' }}
            />
          </div>

          {erreur && (
            <p role="alert" style={{ color: 'var(--rouge)', fontSize: 15, margin: 0 }}>
              {erreur}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{
              height: 56,
              fontSize: 17,
              fontWeight: 600,
              background: 'var(--bleu-ciel)',
              color: '#fff',
              borderRadius: 12,
              marginTop: 4,
              touchAction: 'manipulation',
            }}
          >
            {loading ? 'Enregistrement…' : 'ENREGISTRER'}
          </Button>
        </form>
      </div>
    </div>
  )
}
