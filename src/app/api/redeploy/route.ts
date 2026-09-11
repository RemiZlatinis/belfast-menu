import { NextResponse } from 'next/server'
import { tryGetPayload } from '@/lib/payload'

export const dynamic = 'force-dynamic'

/**
 * POST /api/redeploy — fires the Vercel Deploy Hook so CMS edits go live.
 * - Requires a logged-in admin (checked via Payload auth).
 * - Needs VERCEL_DEPLOY_HOOK_URL set in env (create it in Vercel yourself:
 *   Project → Settings → Git → Deploy Hooks). Never commit the URL.
 */
export async function POST(req: Request) {
  const payload = await tryGetPayload()
  if (!payload) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 })
  }

  let user: unknown = null
  try {
    const auth = await payload.auth({ headers: req.headers })
    user = auth?.user ?? null
  } catch {
    user = null
  }
  if (!user) {
    return NextResponse.json({ error: 'Login required.' }, { status: 401 })
  }
  // Single-admin project: only admins may fire deploys (editors do not exist yet).
  if ((user as { role?: string })?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin required.' }, { status: 403 })
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL
  if (!hook) {
    return NextResponse.json(
      { error: 'VERCEL_DEPLOY_HOOK_URL is not set. Add it in Vercel env first.' },
      { status: 400 },
    )
  }

  // Bounded timeout so a stalled hook never hangs the route / admin button.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetch(hook, { method: 'POST', signal: ctrl.signal })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Vercel hook returned ${res.status}. Check the URL.` },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      return NextResponse.json({ error: 'Vercel hook timed out after 10s.' }, { status: 504 })
    }
    return NextResponse.json(
      { error: `Could not reach Vercel: ${(err as Error)?.message}` },
      { status: 502 },
    )
  } finally {
    clearTimeout(timer)
  }
}
