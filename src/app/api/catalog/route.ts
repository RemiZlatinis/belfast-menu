import { NextResponse } from 'next/server'
import { staticMenu } from '@/lib/menu-data'
import { getMenu } from '@/lib/payload'

export const dynamic = 'force-dynamic'

function dbStatus() {
  const hasNeon = !!(
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL
  )
  const hasTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
  const hasUri = !!process.env.DATABASE_URI
  if (hasNeon) return { mode: 'neon-postgres', persistent: true }
  if (hasTurso) return { mode: 'turso', persistent: true }
  if (hasUri) return { mode: 'database_uri', persistent: true }
  if (!process.env.VERCEL) return { mode: 'local-sqlite', persistent: true }
  return { mode: 'ephemeral-vercel-no-db', persistent: false }
}

export async function GET() {
  const status = dbStatus()
  if (!status.persistent) {
    return NextResponse.json({
      source: 'static-fallback-vercel-no-db',
      message:
        'Vercel has no persistent DB (set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN or DATABASE_URI for live CMS). Serving static catalogue.',
      updatedAt: new Date().toISOString(),
      categories: staticMenu,
    })
  }

  const menu = await getMenu()
  if (menu?.categories?.length) {
    // Normalize collection shape (slug) to the frontend shape (id) + legacy global shape.
    const categories = (menu.categories as unknown as {
      slug?: string
      id?: string
      title: string
      subtitle?: string | null
      subcategories?: { label?: string | null; items?: { name: string; price: string; note?: string | null }[] | null }[] | null
    }[]).map((c) => ({
      id: c.slug || c.id,
      slug: c.slug || c.id,
      title: c.title,
      subtitle: c.subtitle ?? undefined,
      subcategories: c.subcategories || [],
    }))
    return NextResponse.json({
      source: 'payload',
      menu: { title: menu.title, slug: menu.slug },
      updatedAt: menu.updatedAt || new Date().toISOString(),
      categories,
    })
  }

  return NextResponse.json({
    source: 'static-fallback',
    message: 'Payload menu empty — serving static catalogue. Visit /admin → Menus to seed.',
    categories: staticMenu,
  })
}
