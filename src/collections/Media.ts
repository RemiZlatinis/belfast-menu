import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
// src/collections/Media.ts -> project root is two levels up
const dirname = path.resolve(path.dirname(filename), '..', '..')

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    // Editors may upload/replace photos for the catalogue; deletes stay admin-only.
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [{ name: 'alt', type: 'text' }],
  upload: {
    // Local-only uploads (Vercel filesystem is ephemeral/read-only — no Blob adapter yet).
    staticDir: path.resolve(dirname, 'public/media'),
    // Raster only: image/* would allow SVG, served same-origin → stored XSS.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
  },
}
