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
    // Single-owner project: only admins may upload/replace/delete.
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
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
