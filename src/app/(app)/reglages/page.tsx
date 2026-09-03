import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ReglagesView } from '@/components/reglages/ReglagesView'

export default async function ReglagesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <ReglagesView
      user={{
        name: session.user.name,
        username: (session.user as { username?: string }).username ?? '',
      }}
    />
  )
}
