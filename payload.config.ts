import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import seedMenu from './src/lib/menu-seed.json'
// Collections live in src/collections (best practice — config only wires them).
// NOTE: explicit `.ts` extensions are required: Payload loads this config via
// CJS `require`, whose resolver does not probe `.ts` for extensionless paths.
import { Users } from './src/collections/Users.ts'
import { Media } from './src/collections/Media.ts'
import { Menus } from './src/collections/Menus.ts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// NOTE: no richtext fields are used anywhere, so no editor is configured.
// This intentionally avoids @payloadcms/richtext-lexical (top-level-await
// breaks the payload CLI under tsx on Node 20/22).

type SeedItem = { name: string; price: string; note?: string | null }
type SeedSub = { label?: string | null; items: SeedItem[] }
type SeedCat = {
  id: string
  title: string
  subtitle?: string | null
  subcategories: SeedSub[]
}
const seedCategories = seedMenu as unknown as SeedCat[]

function resolveServerURL(): string {
  if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

// DB resolution:
// - Neon (Postgres): when a postgres connection string is set — this is the
//   persistent production DB. Vercel's Neon integration provides DATABASE_URL
//   (pooled). POSTGRES_URL is accepted as a fallback (older integration).
// - Local dev: file:./belfast.db (sqlite file, zero config)
// - Vercel without Neon: file:/tmp/belfast.db (ephemeral; CMS falls back to static — see /api/catalog)
// - Vercel with Turso: libsql remote (persistent CMS). Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
function resolvePostgresURL(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    null
  )
}

function resolveDatabaseConfig() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  if (tursoUrl && tursoToken) {
    return { url: tursoUrl, authToken: tursoToken }
  }
  if (process.env.DATABASE_URI) return { url: process.env.DATABASE_URI }
  if (process.env.VERCEL) return { url: 'file:/tmp/belfast.db' }
  return { url: 'file:./belfast.db' }
}

const postgresURL = resolvePostgresURL()

const isEphemeralVercelNoDb =
  !!process.env.VERCEL &&
  !postgresURL &&
  !process.env.TURSO_DATABASE_URL &&
  !process.env.DATABASE_URI

export default buildConfig({
  serverURL: resolveServerURL(),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-belfast-32-chars-long-please-change',
  sharp,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— ΜΠΕΛΦΑΣΤ CMS',
      description: 'Manage the ΜΠΕΛΦΑΣΤ Urban Pub catalogue',
    },
  },
  // Neon Postgres when a connection string is set (incl. Vercel),
  // otherwise local sqlite. Each dialect has its own migration dir —
  // the payload CLI commands (migrate/migrate:create/...) automatically
  // target the right one based on env.
  db: postgresURL
    ? postgresAdapter({
        pool: { connectionString: postgresURL },
        push: false,
        migrationDir: path.resolve(dirname, 'src/migrations-pg'),
      })
    : sqliteAdapter({
        client: resolveDatabaseConfig(),
        migrationDir: path.resolve(dirname, 'src/migrations'),
        // push only for local prototyping; Vercel + prod must use migrations
        push: !process.env.VERCEL && process.env.NODE_ENV !== 'production',
      }),
  collections: [Users, Media, Menus],
  globals: [],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  graphQL: { schemaOutputFile: path.resolve(dirname, 'generated-schema.graphql') },
  onInit: async (payload) => {
    try {
      // Skip seeding on ephemeral Vercel (no persistent DB) — frontend uses static fallback.
      if (isEphemeralVercelNoDb) {
        payload.logger.info('Skipping seed: ephemeral Vercel without Neon/Turso/DATABASE_URI')
        return
      }
      const existing = await payload.find({ collection: 'menus', limit: 1 })
      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'menus',
          data: {
            title: 'ΜΠΕΛΦΑΣΤ Catalogue',
            slug: 'main',
            description: 'Βασιλέως Κωνσταντίνου 26, Ξάνθη',
            categories: seedCategories.map((cat) => ({
              slug: cat.id,
              title: cat.title,
              subtitle: cat.subtitle ?? undefined,
              subcategories: cat.subcategories.map((sub) => ({
                label: sub.label ?? undefined,
                items: sub.items.map((it) => ({
                  name: it.name,
                  price: it.price,
                  note: it.note ?? undefined,
                })),
              })),
            })),
          },
        })
        payload.logger.info('Seeded menus collection from menu-seed.json (138 drinks, 9 categories)')
      }
      if (!process.env.VERCEL) {
        const users = await payload.find({ collection: 'users', limit: 1 })
        if (users.totalDocs === 0) {
          await payload.create({
            collection: 'users',
            data: {
              email: process.env.PAYLOAD_FIRST_USER_EMAIL || 'admin@belfast.pub',
              password: process.env.PAYLOAD_FIRST_USER_PASSWORD || 'admin123',
              role: 'admin',
            },
          })
          payload.logger.info('Created default admin user (change password after first login)')
        }
      }
    } catch (err) {
      payload.logger.error({ err }, 'onInit seed failed')
    }
  },
})
