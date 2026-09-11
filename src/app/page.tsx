import { staticMenu, defaultSite } from "@/lib/menu-data";
import type { Category, SiteSettings } from "@/lib/menu-data";
import { getMenu } from "@/lib/payload";
import { MenuClient } from "@/components/MenuClient";

// SSG: both language menus + site texts are baked in at build time (Neon on
// Vercel, sqlite locally, static fallback when no DB). The EL/EN toggle then
// switches instantly client-side. CMS edits go live via redeploy.
async function loadDoc(slug: string): Promise<{ menu: Category[]; site: SiteSettings } | null> {
  try {
    const doc = await getMenu(slug);
    if (doc?.categories?.length) {
      const menu: Category[] = doc.categories.map((c) => ({
        id: c.slug,
        title: c.title,
        subtitle: c.subtitle ?? undefined,
        count: (c.subcategories || []).reduce((acc, s) => acc + (s.items?.length || 0), 0),
        subcategories: (c.subcategories || []).map((s) => ({
          label: s.label || undefined,
          items: (s.items || []).map((it) => ({
            name: it.name,
            price: it.price,
            note: it.note || undefined,
          })),
        })),
      }));
      const s = doc.site;
      const site: SiteSettings = {
        badge: s?.badge || defaultSite.badge,
        brandName: s?.brandName || defaultSite.brandName,
        brandSuffix: s?.brandSuffix || defaultSite.brandSuffix,
        address: s?.address || defaultSite.address,
        tagline: s?.tagline || defaultSite.tagline,
        searchPlaceholder: s?.searchPlaceholder || defaultSite.searchPlaceholder,
        visitKicker: s?.visitKicker || defaultSite.visitKicker,
        visitText: s?.visitText || defaultSite.visitText,
        footerNote: s?.footerNote || defaultSite.footerNote,
        footerBrand: s?.footerBrand || defaultSite.footerBrand,
      };
      return { menu, site };
    }
  } catch {
    // build must never fail because of the DB — fall through to null
  }
  return null;
}

export default async function Home() {
  const el = (await loadDoc("main")) ?? { menu: staticMenu, site: defaultSite };
  // EN falls back to EL content so the toggle never renders an empty page.
  const en = (await loadDoc("en")) ?? el;
  return (
    <MenuClient
      initialMenuEl={el.menu}
      initialSiteEl={el.site}
      initialMenuEn={en.menu}
      initialSiteEn={en.site}
    />
  );
}
