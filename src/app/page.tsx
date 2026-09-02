import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <main style={{ padding: 24, color: 'var(--encre)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>
        Bonjour, {session.user.name}
      </h1>
      <p style={{ marginTop: 8, color: 'var(--encre-douce)' }}>
        Lot 1 à venir — machine à états
      </p>
    </main>
  )
}
