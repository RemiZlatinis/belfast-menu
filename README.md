# ΜΠΕΛΦΑΣΤ URBAN PUB — Catalogue

Beautiful catalogue site for **ΜΠΕΛΦΑΣΤ Urban Pub** — Βασιλέως Κωνσταντίνου 26, Ξάνθη.

Recreated faithfully from the original PDF catalogue into a modern, responsive Next.js site.
The entire menu is **managed in Payload CMS** (sqlite locally) and served dynamically —
with a graceful static fallback on Vercel where no database is configured.

**Live:** `bun dev` → http://localhost:3000 · CMS → http://localhost:3000/admin

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- TypeScript
- Payload CMS 3 + sqlite (libSQL) locally
- Bun (local dev) / npm (Vercel builds)

## Catalogue

Covers the full PDF — **~144 items** across:

- **Beverages** (19) — Schweppes, Fanta, Coca-Cola, Red Bull, Three Cents, Fever Tree, Bundaberg, Gia Giamas, Arizona …
- **Beers** (14) — Carlsberg, Marmita, Άλφα, Μάμος, Βεργίνα, Guinness, Kaiser, Fischer, Νύμφη, Fix …
- **Craft Beers** (11) — Marmita, Utopia, Sourmena Brew, ΤΑΩΣ, Strange Brew …
- **Whiskeys** (38) — Irish / Scotch / Bourbon / Premium (Tullamore, Jameson, Bushmills, Chivas, Talisker, Lagavulin, Macallan …)
- **Rum** (14) — Havana, Diplomatico, Zacapa …
- **Gin** (16) — Beefeater, Hendrick's, Roku, Monkey 47 …
- **Vodka** (7) — Absolut, Grey Goose, Belvedere …
- **Cognac** (4) — Hennessy, Metaxa …
- **Cocktails** (15) — Negroni, Old Fashioned, Margarita, Mojito, Zombie …

Design tokens match the PDF:

- Cream `#F5EFE0` / paper `#FAF6EB`
- Forest green `#163F1A`
- Serif headings (Playfair Display / Cormorant Garamond) + DM Sans body
- Faithful pill logo in the hero, thin-line catalogue header/footer, dotted menu rows

## Development

```bash
# install
bun install

# dev (Turbopack) — Payload auto-seeds catalog + default admin on first boot
bun dev

# open the CMS
open http://localhost:3000/admin
# default admin: admin@belfast.pub / admin123 (change after first login)

# build
bun run build

# lint
bun run lint
```

## Payload CMS

- **Local:** sqlite file `./belfast.db` (zero config). First boot runs migrations,
  seeds the `menus` collection (one **"Main catalogue"** doc) from `src/lib/menu-seed.json`,
  and creates the default admin user. Edit everything at `/admin` → **Menus** →
  Main catalogue (categories → groups → drinks, drag to reorder).
- **SSG homepage:** `src/app/page.tsx` (server component) bakes the menu into static
  HTML at build time — Neon on Vercel, sqlite locally, static fallback with no DB.
  CMS edits go live via redeploy (the **Deploy site** button in `/admin`).
- **Single source of truth:** `src/lib/menu-seed.json` feeds both the Payload seed and
  the static fallback (`src/lib/menu-data.ts`).
- **Useful scripts:** `bun run migrate` · `bun run migrate:create` · `bun run migrate:status` ·
  `bun run generate:types` · `bun run generate:importmap`
- Never commit `*.db` (gitignored). **Do** commit `src/migrations/` + `payload-types.ts`.

## Deploy to Vercel (no database — static fallback kept)

Import `RemiZlatinis/belfast-menu` at https://vercel.com/new — framework auto-detected as
**Next.js**. No env vars needed: without a persistent DB, the build bakes in
the static catalogue and the site works fully (CMS editing happens locally).

`vercel.json` forces `npm install` + `npm run build` while keeping `bun` for local dev.
Both `bun.lock` and `package-lock.json` are committed.

```bash
# Vercel CLI
npm i -g vercel
vercel --prod

# or push to main — Vercel auto-deploys
git push origin main
```

Optional (persistent CMS on Vercel via Neon Postgres): set `DATABASE_URL`,
`PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL` in Vercel env — the build bakes the live
menu into the static page and `/admin` edits the live database. (Turso also supported.)

## Project structure

```
payload.config.ts        — Payload (users, media, menus collection, sqlite/Turso, seed)
src/migrations/          — committed DB migrations
src/lib/menu-seed.json   — seed + static fallback source of truth
src/lib/menu-data.ts     — typed re-export for the frontend
src/lib/payload.ts       — cached Payload accessor with Vercel no-DB guard
src/app/
  layout.tsx             — fonts (Playfair, Cormorant, DM Sans) + metadata
  page.tsx               — SSG server component (loads menu at build time)
  api/redeploy/route.ts  — fires VERCEL_DEPLOY_HOOK_URL (login required)
  (payload)/             — official Payload routes (admin, api, layout, importMap)
```

## Address

> ΜΠΕΛΦΑΣΤ URBAN PUB  
> Βασιλέως Κωνσταντίνου 26, Ξάνθη
