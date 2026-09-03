'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
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
    <div className="flex flex-col min-h-screen items-center justify-center px-4" style={{ background: 'var(--fond)' }}>
      <Image
        src="/foird-gerber-logo.jpg"
        alt="Froid Climatisation Gerber"
        width={220}
        height={78}
        priority
        unoptimized
        style={{ objectFit: 'contain', marginBottom: 32 }}
      />
      <div className="w-full max-w-sm" style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid var(--trait)' }}>
        <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--encre)', marginBottom: 8 }}>
          Connexion à votre espace
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" style={{ fontSize: 18, color: 'var(--encre)' }}>
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
              style={{ height: 56, fontSize: 18 }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" style={{ fontSize: 18, color: 'var(--encre)' }}>
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ height: 56, fontSize: 18 }}
            />
          </div>

          {error && (
            <p role="alert" style={{ color: 'var(--rouge)', fontSize: 15 }}>{error}</p>
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
              marginTop: 8,
            }}
          >
            {loading ? 'Connexion…' : 'SE CONNECTER'}
          </Button>
        </form>
      </div>
    </div>
  )
}
