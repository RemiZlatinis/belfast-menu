/**
 * One-shot seed for the REMOTE database (Neon Postgres).
 *
 * It reuses payload.config.ts — setting DATABASE_URL makes the config pick
 * the postgres adapter, so this seeds Neon. Without DATABASE_URL it would
 * target local sqlite, so the script refuses to run unless a postgres
 * connection string is set (safety guard).
 *
 * NOTE: `tsx` currently cannot boot Payload under Next 16
 * (`loadEnvConfig` interop crash), so the reliable remote-seed method is
 * booting the app itself with DATABASE_URL set — onInit seeds automatically:
 *   DATABASE_URL="postgresql://..." PAYLOAD_SECRET="..." npm run dev
 * then curl http://localhost:3000/api/catalog once and stop the server.
 * This script is kept for CI / future toolchains where the interop is fixed:
 *   npx tsx scripts/seed-remote.ts   (needs DATABASE_URL + PAYLOAD_SECRET)
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import seedMenu from '../src/lib/menu-seed.json'

type SeedItem = { name: string; price: string; note?: string | null }
type SeedSub = { label?: string | null; items: SeedItem[] }
type SeedCat = {
  id: string
  title: string
  subtitle?: string | null
  subcategories: SeedSub[]
}
const seedCategories = seedMenu as unknown as SeedCat[]

async function main() {
  const pgURL =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL
  if (!pgURL) {
    throw new Error(
      'Refusing to run: set DATABASE_URL (Neon pooled connection string) first.',
    )
  }

  const payload = await getPayload({ config })

  const existing = await payload.find({ collection: 'menus', limit: 1 })
  if (existing.totalDocs > 0) {
    payload.logger.info(
      `Menus already seeded (${existing.totalDocs} doc(s)) — skipping. Delete the doc in /admin to re-seed.`,
    )
  } else {
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
    const count = seedCategories.reduce(
      (acc, c) => acc + c.subcategories.reduce((a, s) => a + s.items.length, 0),
      0,
    )
    payload.logger.info(
      `Seeded menus collection: ${seedCategories.length} categories, ${count} drinks.`,
    )
  }

  // Create an admin user remotely if none exists (uses env or falls back to local default).
  // On Vercel/prod onInit deliberately skips this, so the seed script is the way.
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
    payload.logger.info('Created admin user (change password after first login).')
  } else {
    payload.logger.info('Admin user already exists — skipping.')
  }

  // Close the DB pool so the script exits cleanly.
  if (typeof payload.db.destroy === 'function') await payload.db.destroy()
  process.exit(0)
}

main().catch((err) => {
  console.error('[seed-remote] failed:', err)
  process.exit(1)
})
