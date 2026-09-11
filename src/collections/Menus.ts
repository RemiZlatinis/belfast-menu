import type { CollectionConfig } from 'payload'

/**
 * Menus — the ONE collection a simple user needs to understand.
 *
 * One document = one catalogue page (we seed a single "main" menu).
 * Everything lives inside it, fully dynamic:
 *   Menu -> Categories (array, drag to reorder)
 *     -> Groups / Sub-categories (array, e.g. IRISH / SCOTCH — leave empty for a single list)
 *       -> Drinks / Items (array: name + price + optional note)
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
    // Public menu must be readable without login (SSG homepage reads it at build time).
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
