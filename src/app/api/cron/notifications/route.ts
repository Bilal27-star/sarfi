import { NextResponse } from 'next/server'
import { generateDueNotifications } from '@/server/services/notification-engine'

/** Invoked daily by Vercel Cron (see vercel.json). Vercel attaches
 * `Authorization: Bearer $CRON_SECRET` automatically once CRON_SECRET is
 * set as a Production env var — this rejects any other caller, since the
 * endpoint writes Notification rows for every user. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary = await generateDueNotifications()
  return NextResponse.json(summary)
}
