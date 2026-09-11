import { NextResponse } from 'next/server'

// Liveness probe for uptime monitors. Intentionally does NOT boot Payload —
// cheap, never fails because of the DB. Use /api/menus or the homepage to
// check CMS connectivity instead.
export const dynamic = 'force-dynamic'

function dbMode(): string {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL)
    return 'postgres'
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) return 'turso'
  if (process.env.DATABASE_URI) return 'database_uri'
  if (process.env.VERCEL) return 'ephemeral-static'
  return 'local-sqlite'
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    db: dbMode(),
  })
}
