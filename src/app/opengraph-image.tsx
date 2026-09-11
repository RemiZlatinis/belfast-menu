import { ImageResponse } from 'next/og'

// Link-preview card (WhatsApp, iMessage, Telegram, X, …) with the pill logo.
// Statically generated at build time.
export const alt = 'ΜΠΕΛΦΑΣΤ Urban Pub — product catalogue'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Noto Sans covers Greek + Latin. `text=` subsets to exactly the chars used
// so the font payload stays tiny — built from the exact rendered strings
// (uppercase Greek codepoints differ from lowercase).
const BRAND = 'ΜΠΕΛΦΑΣΤ'
const SUFFIX = 'URBAN PUB'
const ADDRESS = 'ΒΑΣΙΛΕΩΣ ΚΩΝΣΤΑΝΤΙΝΟΥ 26, ΞΑΝΘΗ'
const CHARS = Array.from(new Set(`${BRAND}${SUFFIX}${ADDRESS}`)).join('')
async function loadFont(weight: 400 | 800): Promise<ArrayBuffer> {
  const css = await (
    await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans:wght@${weight}&display=swap&text=${encodeURIComponent(CHARS)}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; preview-bot/1.0)' },
        signal: AbortSignal.timeout(10_000),
      },
    )
  ).text()
  const url = css.match(/url\((https:[^)]+)\)/)?.[1]
  if (!url) throw new Error(`Font CSS has no URL (weight ${weight})`)
  return await (await fetch(url, { signal: AbortSignal.timeout(10_000) })).arrayBuffer()
}

export default async function OGImage() {
  let fonts: { name: string; data: ArrayBuffer; weight: 400 | 800 }[] = []
  try {
    const [regular, extraBold] = await Promise.all([loadFont(400), loadFont(800)])
    fonts = [
      { name: 'Noto Sans', data: regular, weight: 400 },
      { name: 'Noto Sans', data: extraBold, weight: 800 },
    ]
  } catch {
    // Degraded OG (no custom fonts) is better than a failed build.
    fonts = []
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#163f1a',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '5px solid #F5EFE0',
            borderRadius: '90px',
            padding: '56px 110px',
          }}
        >
          <div
            style={{
              fontFamily: 'Noto Sans',
              fontWeight: 800,
              fontSize: 124,
              lineHeight: 1,
              color: '#F5EFE0',
              letterSpacing: -2,
            }}
          >
            {BRAND}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 26 }}>
            <div style={{ width: 72, height: 3, backgroundColor: '#C2A878' }} />
            <div
              style={{
                fontFamily: 'Noto Sans',
                fontWeight: 400,
                fontSize: 34,
                color: '#F5EFE0',
                letterSpacing: 22,
                marginLeft: 22,
                marginRight: 0,
              }}
            >
              {SUFFIX}
            </div>
            <div style={{ width: 72, height: 3, backgroundColor: '#C2A878' }} />
          </div>
        </div>
        <div
          style={{
            fontFamily: 'Noto Sans',
            fontWeight: 400,
            fontSize: 30,
            color: 'rgba(245,239,224,0.65)',
            letterSpacing: 8,
            marginTop: 44,
          }}
        >
          {ADDRESS}
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  )
}
