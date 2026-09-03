'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { markPasswordChanged } from '@/actions/auth/markPasswordChanged'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ChangerMotDePassePage() {
  const router = useRouter()
  const [actuel, setActuel] = useState('')
  const [mdp, setMdp] = useState('')
  const [confirm, setConfirm] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mdp !== confirm) { setErreur('Les mots de passe ne correspondent pas.'); return }
    if (mdp.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères.'); return }
    if (mdp === actuel) { setErreur('Le nouveau mot de passe doit être différent du mot de passe temporaire.'); return }

    setLoading(true)
    setErreur('')

    try {
      const result = await authClient.changePassword({
        currentPassword: actuel,
        newPassword: mdp,
        revokeOtherSessions: false,
      })

      if (result.error) {
        setErreur('Mot de passe temporaire incorrect.')
        setLoading(false)
        return
      }

      await markPasswordChanged()
      router.push('/')
      router.refresh()
    } catch {
      setErreur('Erreur lors du changement de mot de passe. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col min-h-screen items-center justify-center px-4"
      style={{ background: 'var(--fond)' }}
    >
      <Image
        src="/foird-gerber-logo.jpg"
        alt="Froid Climatisation Gerber"
        width={220}
        height={78}
        priority
        unoptimized
        style={{ objectFit: 'contain', marginBottom: 32 }}
      />

      <div
        className="w-full max-w-sm"
        style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid var(--trait)' }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)', marginBottom: 8 }}>
          Choisissez votre mot de passe
        </h1>
        <p style={{ fontSize: 15, color: 'var(--encre-douce)', marginBottom: 32 }}>
          Première connexion — définissez un mot de passe personnel.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="actuel" style={{ fontSize: 18 }}>
              Mot de passe temporaire
            </Label>
            <Input
              id="actuel"
              type="password"
              value={actuel}
              onChange={e => setActuel(e.target.value)}
              required
              autoComplete="current-password"
              style={{ height: 56, fontSize: 18 }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mdp" style={{ fontSize: 18 }}>
              Nouveau mot de passe
            </Label>
            <Input
              id="mdp"
              type="password"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              required
              autoComplete="new-password"
              style={{ height: 56, fontSize: 18 }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm" style={{ fontSize: 18 }}>
              Confirmer
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              style={{ height: 56, fontSize: 18 }}
            />
          </div>

          {erreur && (
            <p role="alert" style={{ color: 'var(--rouge)', fontSize: 15 }}>
              {erreur}
            </p>
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
      </div>
    </div>
  )
}
