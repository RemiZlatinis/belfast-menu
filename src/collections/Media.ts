import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
// src/collections/Media.ts -> project root is two levels up
const dirname = path.resolve(path.dirname(filename), '..', '..')

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  fields: [{ name: 'alt', type: 'text' }],
  upload: {
    staticDir: path.resolve(dirname, 'public/media'),
    mimeTypes: ['image/*'],
  },
}
