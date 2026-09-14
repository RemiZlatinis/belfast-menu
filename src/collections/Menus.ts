import type { CollectionConfig } from 'payload'

/**
 * Menus — the ONE collection a simple user needs to understand.
 *
 * One document = one catalogue page (we seed "main" + "en").
 * Everything lives inside it, fully dynamic:
 *   Menu -> Categories (array, drag to reorder)
 *     -> Groups / Sub-categories (array, e.g. IRISH / SCOTCH — leave empty for a single list)
 *       -> Drinks / Items (array: name + price + optional note)
 *
 * Admin UX notes (no DB shape change — tabs are unnamed, RowLabels are display-only):
 * - 3 tabs keep the 144-drink list separate from site texts and settings.
 * - Arrays start collapsed with compact row labels so scanning is fast.
 * - Category slugs auto-fill from the title; price format is validated.
 */

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export const Menus: CollectionConfig = {
  slug: 'menus',
  labels: { singular: 'Menu', plural: 'Menus' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description: 'The catalogue page. Open the "Main catalogue" to edit categories & drinks.',
  },
  access: {
    // Public menu must be readable without login (SSG homepage reads it at build time).
    read: () => true,
    // Bar staff (editor) may update prices/availability on existing docs; creating
    // docs (new languages) and deletes stay admin-only. Site texts + settings
    // are additionally locked to admins via field-level access below.
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    // Instant publishing: saving the menu revalidates the homepage so edits
    // go live without the manual "Deploy site" redeploy. Never fails the save.
    // Lazy import keeps `next/cache` out of the module graph so the Payload
    // CLI (migrate/generate) can load this config outside the Next runtime.
    afterChange: [
      async () => {
        try {
          const { revalidatePath } = await import('next/cache')
          revalidatePath('/')
        } catch {
          // No cache to revalidate (e.g. migrate CLI) — ignore.
        }
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Catalogue',
          admin: {
            description:
              'Categories → Groups → Drinks. Drag to reorder. Mirrors the PDF order (Beverages → Cocktails).',
          },
          fields: [
            {
              name: 'categories',
              label: 'Categories',
              type: 'array',
              required: true,
              labels: { singular: 'Category', plural: 'Categories' },
              admin: {
                description: 'Drag to reorder. One category = one section on the page.',
                initCollapsed: true,
                components: {
                  RowLabel: {
                    path: '@/components/admin/MenuRowLabels',
                    exportName: 'CategoryRowLabel',
                  },
                },
              },
              fields: [
                {
                  name: 'slug',
                  label: 'Slug (e.g. beverages)',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Lowercase, no spaces — used for page anchors. Auto-fills from Title.',
                  },
                  hooks: {
                    beforeValidate: [
                      ({ value, siblingData }) => {
                        if (value && typeof value === 'string' && value.trim()) return value.trim()
                        const title = (siblingData as { title?: unknown } | undefined)?.title
                        if (typeof title === 'string' && title.trim()) {
                          const slug = slugify(title)
                          if (slug) return slug
                        }
                        return value
                      },
                    ],
                  },
                  validate: (value: unknown) => {
                    if (typeof value !== 'string' || !value.trim()) return 'Slug is required.'
                    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) {
                      return 'Use lowercase letters, numbers and dashes only (e.g. craft-beers).'
                    }
                    return true
                  },
                },
                {
                  name: 'title',
                  label: 'Title (e.g. BEVERAGES)',
                  type: 'text',
                  required: true,
                },
                { name: 'subtitle', label: 'Subtitle (e.g. Αναψυκτικά)', type: 'text' },
                {
                  name: 'subcategories',
                  label: 'Groups (sub-categories)',
                  type: 'array',
                  labels: { singular: 'Group', plural: 'Groups' },
                  admin: {
                    description:
                      'Use Group label for IRISH / SCOTCH / PREMIUM. One group with empty label = single list.',
                    initCollapsed: true,
                    components: {
                      RowLabel: {
                        path: '@/components/admin/MenuRowLabels',
                        exportName: 'GroupRowLabel',
                      },
                    },
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
                      admin: {
                        description: 'Drag to reorder drinks inside the group.',
                        initCollapsed: true,
                        components: {
                          RowLabel: {
                            path: '@/components/admin/MenuRowLabels',
                            exportName: 'DrinkRowLabel',
                          },
                        },
                      },
                      fields: [
                        { name: 'name', label: 'Name', type: 'text', required: true },
                        {
                          name: 'price',
                          label: 'Price',
                          type: 'text',
                          required: true,
                          admin: { description: 'e.g. 3€ or 3,5€ — always end with €.' },
                          validate: (value: unknown) => {
                            if (typeof value !== 'string' || !value.trim()) return 'Price is required.'
                            if (!/^\d+([.,]\d{1,2})?\s*€$/.test(value.trim())) {
                              return 'Use a price like 3€ or 3,5€ (number + €).'
                            }
                            return true
                          },
                        },
                        { name: 'note', label: 'Note (optional)', type: 'text' },
                        {
                          name: 'available',
                          label: 'Available',
                          type: 'checkbox',
                          defaultValue: true,
                          admin: {
                            description: 'Uncheck to mark as sold out (stays listed, dimmed).',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Site content (hero, address, footer)',
          admin: {
            description:
              'Every text on the homepage outside the drinks list. Leave empty to keep defaults.',
          },
          fields: [
            {
              name: 'site',
              label: 'Site content',
              type: 'group',
              access: {
                update: ({ req }) => req.user?.role === 'admin',
              },
              fields: [
                { name: 'badge', label: 'Hero badge (e.g. ΞΑΝΘΗ • URBAN PUB)', type: 'text' },
                { name: 'brandName', label: 'Brand name (e.g. ΜΠΕΛΦΑΣΤ)', type: 'text' },
                { name: 'brandSuffix', label: 'Brand suffix (e.g. URBAN PUB)', type: 'text' },
                {
                  name: 'address',
                  label: 'Address (e.g. Βασιλέως Κωνσταντίνου 26, Ξάνθη)',
                  type: 'text',
                },
                {
                  name: 'tagline',
                  label: 'Hero tagline (e.g. Product catalogue — authentic pub menu)',
                  type: 'text',
                },
                {
                  name: 'searchPlaceholder',
                  label: 'Search placeholder (e.g. Search whisky, gin, beer...)',
                  type: 'text',
                },
                { name: 'visitKicker', label: 'Visit card kicker (e.g. VISIT US)', type: 'text' },
                {
                  name: 'visitText',
                  label: 'Visit card text (e.g. Open daily — full menu available at the bar. Prices in €.)',
                  type: 'text',
                },
                { name: 'footerNote', label: 'Footer note (e.g. All prices incl.)', type: 'text' },
                { name: 'footerBrand', label: 'Footer copyright (e.g. ΜΠΕΛΦΑΣΤ Urban Pub)', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Settings',
          admin: { description: 'Which catalogue page this is. Rarely changes.' },
          fields: [
            {
              name: 'title',
              label: 'Menu title',
              type: 'text',
              required: true,
              defaultValue: 'ΜΠΕΛΦΑΣΤ Catalogue',
              access: {
                update: ({ req }) => req.user?.role === 'admin',
              },
            },
            {
              name: 'slug',
              label: 'Slug',
              type: 'text',
              required: true,
              unique: true,
              defaultValue: 'main',
              access: {
                update: ({ req }) => req.user?.role === 'admin',
              },
              admin: {
                description: 'Keep "main" — the website loads this menu. Use another slug for drafts.',
              },
            },
            {
              name: 'description',
              label: 'Description',
              type: 'text',
              access: {
                update: ({ req }) => req.user?.role === 'admin',
              },
              admin: { description: 'Optional short line shown under the title (e.g. address).' },
            },
          ],
        },
      ],
    },
  ],
}
