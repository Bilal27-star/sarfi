import { NextResponse } from 'next/server'
import { materializeDueRecurring } from '@/server/services/recurring-materialize'

/** Invoked daily by Vercel Cron (see vercel.json). Vercel attaches
 * `Authorization: Bearer $CRON_SECRET` automatically once CRON_SECRET is
 * set as a Production env var — this rejects any other caller, since the
 * endpoint mutates financial data (creates real Expense rows). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const summary = await materializeDueRecurring()
  return NextResponse.json(summary)
}
