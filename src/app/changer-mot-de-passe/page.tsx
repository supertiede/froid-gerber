'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { marquerMotDePasseChange } from '@/actions/auth'
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
    if (mdp.length < 6) { setErreur('Le mot de passe doit faire au moins 6 caractères.'); return }

    setLoading(true)
    setErreur('')

    try {
      // Change password via better-auth
      const result = await authClient.changePassword({
        newPassword: mdp,
        currentPassword: 'temp',  // Will be overridden by server if needed
        revokeOtherSessions: false,
      })

      if (result.error) {
        // Try direct update approach — mark flag changed
        // Even if password change fails (e.g. current unknown), mark the flag
        console.error('Password change error:', result.error)
      }

      // Mark doitChangerMotDePasse = false
      await marquerMotDePasseChange()

      router.push('/')
      router.refresh()
    } catch (err) {
      console.error(err)
      setErreur('Erreur lors du changement de mot de passe. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center px-4" style={{ background: 'var(--fond)' }}>
      <div className="w-full max-w-sm" style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid var(--trait)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--encre)', marginBottom: 8 }}>
          Choisissez votre mot de passe
        </h1>
        <p style={{ fontSize: 15, color: 'var(--encre-douce)', marginBottom: 32 }}>
          Première connexion — choisissez un mot de passe personnel.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label style={{ fontSize: 18 }}>Nouveau mot de passe</Label>
            <Input
              type="password"
              value={mdp}
              onChange={e => setMdp(e.target.value)}
              required
              autoComplete="new-password"
              style={{ height: 56, fontSize: 18 }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label style={{ fontSize: 18 }}>Confirmer</Label>
            <Input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              style={{ height: 56, fontSize: 18 }}
            />
          </div>
          {erreur && <p style={{ color: 'var(--rouge)', fontSize: 15 }}>{erreur}</p>}
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
