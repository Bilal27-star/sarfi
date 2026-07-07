import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'

/**
 * App launch: route to the right place instantly — no fake loading screen.
 * Signed in + set up -> home; signed in mid-setup -> setup; guest -> welcome.
 */
export default async function RootPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/welcome')
  if (!user.preferences?.setupCompleted) redirect('/setup')
  redirect('/home')
}
