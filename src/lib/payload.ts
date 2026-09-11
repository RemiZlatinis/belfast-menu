import { getPayload as getPayloadRaw, type Payload } from 'payload'
import type { Menu } from '../../payload-types'
import config from '@payload-config'

let cached: Payload | null = null
let failed = false

function hasPersistentDB(): boolean {
  // Neon Postgres (Vercel integration provides DATABASE_URL, pooled)
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL)
    return true
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) return true
  if (process.env.DATABASE_URI) return true
  // Local dev always has file:./belfast.db
  if (!process.env.VERCEL) return true
  return false
}

export async function tryGetPayload(): Promise<Payload | null> {
  if (!hasPersistentDB()) return null
  if (cached) return cached
  if (failed) return null
  try {
    cached = await getPayloadRaw({ config })
    return cached
  } catch (err) {
    failed = true
    console.warn('[payload] init failed, falling back to static:', (err as Error)?.message)
    return null
  }
}

export type MenuDTO = Menu

/** Load the "main" menu doc from the menus collection (falls back to first doc). */
export async function getMenu(slug = 'main'): Promise<Menu | null> {
  const payload = await tryGetPayload()
  if (!payload) return null
  try {
    const bySlug = await payload.find({
      collection: 'menus',
      where: { slug: { equals: slug } },
      limit: 1,
    })
    const doc = bySlug.docs[0] as unknown as Menu | undefined
    if (doc?.categories?.length) return doc
    // Fallback: first menu doc (e.g. slug renamed in CMS)
    const first = await payload.find({ collection: 'menus', limit: 1 })
    const fallback = first.docs[0] as unknown as Menu | undefined
    if (fallback?.categories?.length) return fallback
    return null
  } catch (err) {
    console.warn('[payload] find menus failed:', (err as Error)?.message)
    return null
  }
}

/** Backwards-compatible alias (route + older imports). */
export const getCatalog = getMenu
