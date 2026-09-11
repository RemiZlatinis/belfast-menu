import { staticMenu } from "@/lib/menu-data";
import type { Category } from "@/lib/menu-data";
import { getMenu } from "@/lib/payload";
import { MenuClient } from "@/components/MenuClient";

// SSG: the menu is baked in at build time (Neon on Vercel, sqlite locally,
// static fallback when no DB). CMS edits go live via redeploy (Deploy button).
async function loadMenu(): Promise<Category[]> {
  try {
    const menu = await getMenu();
    if (menu?.categories?.length) {
      return menu.categories.map((c) => ({
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
    }
  } catch {
    // build must never fail because of the DB — fall through to static
  }
  return staticMenu;
}

export default async function Home() {
  const menu = await loadMenu();
  return <MenuClient initialMenu={menu} />;
}
