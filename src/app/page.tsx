import { staticMenu, defaultSite } from "@/lib/menu-data";
import type { Category, SiteSettings } from "@/lib/menu-data";
import { getMenu } from "@/lib/payload";
import { MenuClient } from "@/components/MenuClient";

// SSG: menu + site texts are baked in at build time (Neon on Vercel, sqlite
// locally, static fallback when no DB). CMS edits go live via redeploy.
async function load(): Promise<{ menu: Category[]; site: SiteSettings }> {
  try {
    const doc = await getMenu();
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
    // build must never fail because of the DB — fall through to static
  }
  return { menu: staticMenu, site: defaultSite };
}

export default async function Home() {
  const { menu, site } = await load();
  return <MenuClient initialMenu={menu} initialSite={site} />;
}
