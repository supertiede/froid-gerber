import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function SemainePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <div style={{ padding: 24, color: 'var(--encre)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Ma semaine</h1>
      <p style={{ marginTop: 8, color: 'var(--encre-douce)' }}>Lot 2 à venir</p>
    </div>
  )
}
