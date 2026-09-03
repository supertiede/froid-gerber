import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/SettingsView'

export default async function ReglagesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/login')

  return (
    <SettingsView
      user={{
        name: session.user.name,
        username: (session.user as { username?: string }).username ?? '',
      }}
    />
  )
}
