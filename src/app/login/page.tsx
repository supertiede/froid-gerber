'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authClient.signIn.username({
        username,
        password,
        fetchOptions: { onError: (ctx) => setError(ctx.error.message) },
      })
      router.push('/')
      router.refresh()
    } catch {
      setError('Identifiant ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
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
        <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 20 }}>
          Connexion à votre espace
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="username" style={{ fontSize: 15, fontWeight: 500, color: 'var(--encre)' }}>
              Identifiant
            </Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ex : alexandred"
              required
              aria-required="true"
              style={{ height: 52, fontSize: 17, padding: '0 16px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label htmlFor="password" style={{ fontSize: 15, fontWeight: 500, color: 'var(--encre)' }}>
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              aria-required="true"
              style={{ height: 52, fontSize: 17, padding: '0 16px' }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: 'var(--rouge)', fontSize: 15, margin: 0 }}>{error}</p>
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
            }}
          >
            {loading ? 'Connexion…' : 'SE CONNECTER'}
          </Button>
        </form>
      </div>
    </div>
  )
}
