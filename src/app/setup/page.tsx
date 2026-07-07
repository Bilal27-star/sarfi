import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { SetupWizard } from './setup-wizard'

export const metadata: Metadata = { title: 'Set up' }

export default async function SetupPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/signin')
  if (user.preferences?.setupCompleted) redirect('/home')
  return <SetupWizard />
}
