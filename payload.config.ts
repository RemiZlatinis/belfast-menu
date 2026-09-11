import { buildConfig } from 'payload'
import type { CollectionConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import seedMenu from './src/lib/menu-seed.json'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// NOTE: no richtext fields are used anywhere, so no editor is configured.
// This intentionally avoids @payloadcms/richtext-lexical (top-level-await
// breaks the payload CLI under tsx on Node 20/22).

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  access: {
    admin: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      defaultValue: 'admin',
      required: true,
    },
  ],
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  fields: [{ name: 'alt', type: 'text' }],
  upload: {
    staticDir: path.resolve(dirname, 'public/media'),
    mimeTypes: ['image/*'],
  },
}

/**
 * Menus — the ONE collection a simple user needs to understand.
 *
 * One document = one catalogue page (we seed a single "main" menu).
 * Everything lives inside it, fully dynamic:
 *   Menu -> Categories (array, drag to reorder)
 *     -> Groups / Sub-categories (array, e.g. IRISH / SCOTCH — leave empty for a single list)
 *       -> Drinks / Items (array: name + price + optional note)
 *
 * Defined inline (like Users/Media) because the payload CLI under tsx
 * cannot resolve separate collection files on Node 20/22/24.
 */
export const Menus: CollectionConfig = {
  slug: 'menus',
  labels: { singular: 'Menu', plural: 'Menus' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    description: 'The catalogue page. Open the "Main catalogue" to edit categories & drinks.',
  },
  access: {
    // Public menu must be readable without login (homepage + /api/catalog).
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      label: 'Menu title',
      type: 'text',
      required: true,
      defaultValue: 'ΜΠΕΛΦΑΣΤ Catalogue',
    },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      defaultValue: 'main',
      admin: {
        description: 'Keep "main" — the website loads this menu. Use another slug for drafts.',
      },
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      admin: { description: 'Optional short line shown under the title (e.g. address).' },
    },
    {
      name: 'categories',
      label: 'Categories',
      type: 'array',
      required: true,
      labels: { singular: 'Category', plural: 'Categories' },
      admin: { description: 'Drag to reorder. Mirrors the PDF order (Beverages → Cocktails).' },
      fields: [
        {
          name: 'slug',
          label: 'Slug (e.g. beverages)',
          type: 'text',
          required: true,
          admin: { description: 'Lowercase, no spaces — used for page anchors.' },
        },
        { name: 'title', label: 'Title (e.g. BEVERAGES)', type: 'text', required: true },
        { name: 'subtitle', label: 'Subtitle (e.g. Αναψυκτικά)', type: 'text' },
        {
          name: 'subcategories',
          label: 'Groups (sub-categories)',
          type: 'array',
          labels: { singular: 'Group', plural: 'Groups' },
          admin: {
            description:
              'Use Group label for IRISH / SCOTCH / PREMIUM. One group with empty label = single list.',
          },
          fields: [
            {
              name: 'label',
              label: 'Group label',
              type: 'text',
              admin: { description: 'e.g. IRISH, SCOTCH, PREMIUM — leave empty for none' },
            },
            {
              name: 'items',
              label: 'Drinks / Items',
              type: 'array',
              labels: { singular: 'Drink', plural: 'Drinks' },
              admin: { description: 'Drag to reorder drinks inside the group.' },
              fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                {
                  name: 'price',
                  label: 'Price',
                  type: 'text',
                  required: true,
                  admin: { description: 'e.g. 3€ or 3,5€' },
                },
                { name: 'note', label: 'Note (optional)', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}

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
