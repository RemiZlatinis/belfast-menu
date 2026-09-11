import seed from './menu-seed.json'

export type Item = { name: string; price: string; note?: string; available?: boolean }
export type SubCategory = { label?: string; items: Item[] }
export type Category = {
  id: string
  title: string
  subtitle?: string
  count: number
  subcategories: SubCategory[]
}

// Single source of truth lives in menu-seed.json (also used by Payload seed).
// Kept as JSON so both Next/Turbopack and the Payload CLI (tsx) can load it.
export const staticMenu: Category[] = seed as Category[]

// Every homepage text outside the drinks list — editable in /admin → Menus → Site content.
export type SiteSettings = {
  badge: string
  brandName: string
  brandSuffix: string
  address: string
  tagline: string
  searchPlaceholder: string
  visitKicker: string
  visitText: string
  footerNote: string
  footerBrand: string
}

export const defaultSite: SiteSettings = {
  badge: 'ΞΑΝΘΗ • URBAN PUB',
  brandName: 'ΜΠΕΛΦΑΣΤ',
  brandSuffix: 'URBAN PUB',
  address: 'Βασιλέως Κωνσταντίνου 26, Ξάνθη',
  tagline: 'Product catalogue — authentic pub menu',
  searchPlaceholder: 'Search whisky, gin, beer...',
  visitKicker: 'VISIT US',
  visitText: 'Open daily — full menu available at the bar. Prices in €.',
  footerNote: 'All prices incl.',
  footerBrand: 'ΜΠΕΛΦΑΣΤ Urban Pub',
}

// Uppercase for the footer (Ξάνθη → ΞΑΝΘΗ): strip tonos/diacritics, then uppercase.
export function greekUpper(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export type Lang = 'el' | 'en'

// Interface chrome around the CMS content (both languages baked in at build).
export type UIDict = {
  catalog: string
  pricesIn: string
  itemsWord: string
  categoriesWord: string
  noResults: string
  trySearch: string
  clearSearch: string
  searchLabel: string
  catalogueWord: string
  soldOut: string
}

export const uiDict: Record<Lang, UIDict> = {
  el: {
    catalog: 'ΚΑΤΑΛΟΓΟΣ',
    pricesIn: 'τιμές σε €',
    itemsWord: 'είδη',
    categoriesWord: 'κατηγορίες',
    noResults: 'Κανένα αποτέλεσμα για',
    trySearch: 'Δοκιμάστε “Gin”, “Tullamore” ή “IPA”',
    clearSearch: 'Καθαρισμός',
    searchLabel: 'Αναζήτηση στο μενού',
    catalogueWord: 'Κατάλογος',
    soldOut: 'Εξαντλήθηκε',
  },
  en: {
    catalog: 'PRODUCT CATALOG',
    pricesIn: 'prices in €',
    itemsWord: 'items',
    categoriesWord: 'categories',
    noResults: 'No results for',
    trySearch: 'Try searching “Gin”, “Tullamore” or “IPA”',
    clearSearch: 'Clear search',
    searchLabel: 'Search the menu',
    catalogueWord: 'Catalogue',
    soldOut: 'Sold out',
  },
}
