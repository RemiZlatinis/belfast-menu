import type { MetadataRoute } from 'next'

function siteBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_SERVER_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    'http://localhost:3000'
  if (/^https?:\/\//.test(raw)) return raw.replace(/\/$/, '')
  return `https://${raw}`
}

// Single-page catalogue (EL/EN toggle is client-side) — one URL.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteBase()}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
