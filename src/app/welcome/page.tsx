import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { Onboarding } from './onboarding'

export const metadata: Metadata = { title: 'Welcome' }

export default async function WelcomePage() {
  const user = await getCurrentUser()
  if (user) redirect('/home')
  return <Onboarding />
}
