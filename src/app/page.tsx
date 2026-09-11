"use client";

import { useState, useMemo, useEffect } from "react";
import { staticMenu } from "@/lib/menu-data";
import type { Category } from "@/lib/menu-data";

const navItems = staticMenu.map((c) => ({ id: c.id, label: c.title }));

// Loose DTO for /api/catalog payload rows (DB returns null for empty optionals)
type CatalogItemDTO = { name: string; price: string; note?: string | null }
type CatalogSubDTO = { label?: string | null; items?: CatalogItemDTO[] | null }
type CatalogCategoryDTO = {
  id: string
  title: string
  subtitle?: string | null
  subcategories?: CatalogSubDTO[] | null
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("beverages");
  const [showTop, setShowTop] = useState(false);
  const [menu, setMenu] = useState<Category[]>(staticMenu);

  // Silently load CMS data if available (sqlite locally, static fallback on Vercel)
  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.categories?.length) {
          const normalized: Category[] = (data.categories as CatalogCategoryDTO[]).map((c) => ({
            id: c.id,
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
          setMenu(normalized);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return menu;
    const q = query.toLowerCase();
    return menu
      .map((cat) => ({
        ...cat,
        subcategories: cat.subcategories
          .map((sub) => ({
            ...sub,
            items: sub.items.filter((it) => it.name.toLowerCase().includes(q)),
          }))
          .filter((sub) => sub.items.length > 0),
      }))
      .filter((cat) => cat.subcategories.length > 0);
  }, [query, menu]);

  const totalItems = useMemo(() => menu.reduce((acc, c) => acc + c.count, 0), [menu]);

  // Best-practice scrollspy: rAF-throttled, direction-aware, handles fast scroll
  useEffect(() => {
    const ids = navItems.map((n) => n.id);
    const headerOffset = 176;
    let ticking = false;

    const getActive = () => {
      const scrollPos = window.scrollY + headerOffset;
      // When filtering, only consider visible sections; otherwise all
      const visibleIds = filtered.length ? filtered.map((c) => c.id) : ids;
      let current = visibleIds[0] || ids[0];
      for (const id of visibleIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) current = id;
        else break; // ids are in DOM order; once we pass scrollPos, stop
      }
      // Edge: at bottom, keep last
      return current;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setActiveId(getActive());
        setShowTop(window.scrollY > 700);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [filtered]);

  // Auto-scroll the horizontal nav so the active pill stays visible
  useEffect(() => {
    const navEl = document.querySelector(`[data-nav-id="${activeId}"]`);
    navEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const scrollTo = (id: string) => {
    setActiveId(id);
    // also nudge nav immediately so click feels instant even before observer fires
    document.querySelector(`[data-nav-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    // manual offset (not scrollIntoView) so the section clears the floating bar
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 176;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      {/* HERO — deep green, layered glow + dots, glass pill logo */}
      <section className="relative overflow-hidden bg-[var(--green)]">
        {/* ambient glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(52rem 30rem at 50% -8rem, rgba(194,168,120,0.22), transparent 60%), radial-gradient(36rem 24rem at 12% 110%, rgba(42,107,48,0.55), transparent 65%), radial-gradient(36rem 24rem at 88% 110%, rgba(42,107,48,0.45), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative mx-auto w-full max-w-[760px] flex flex-col items-center px-6 pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.07] px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] text-white/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
            ΞΑΝΘΗ • URBAN PUB
          </p>

          {/* Pill logo — the mark, kept */}
          <div className="animate-rise animate-rise-1 mt-7 w-full rounded-[56px] border border-white/50 bg-white/[0.06] px-6 py-10 sm:px-10 sm:py-13 lg:px-14 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)] backdrop-blur-md flex flex-col items-center justify-center text-center ring-1 ring-white/10 ring-inset">
            <h1
              className="text-white font-black leading-[0.9] tracking-[-0.02em] text-[2.4rem] sm:text-[3.6rem] lg:text-[4.4rem]"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif", fontWeight: 900, letterSpacing: "-0.03em" }}
            >
              ΜΠΕΛΦΑΣΤ
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-8 sm:w-12 bg-[var(--gold)]/70" />
              <p className="text-white/95 text-[0.72rem] sm:text-[0.9rem] font-medium tracking-[0.6em] pl-[0.6em]">URBAN PUB</p>
              <span className="h-px w-8 sm:w-12 bg-[var(--gold)]/70" />
            </div>
          </div>

          <div className="animate-rise animate-rise-2 mt-8 flex flex-col items-center gap-3 text-center">
            <p className="text-white/85 text-[11px] sm:text-xs tracking-[0.3em] uppercase font-medium">Βασιλέως Κωνσταντίνου 26, Ξάνθη</p>
            <p className="text-white/55 text-xs sm:text-[13px] tracking-wide font-light">Product catalogue — authentic pub menu</p>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-medium tracking-wide text-white/70">
              <span className="rounded-full border border-white/20 bg-white/[0.07] px-3 py-1 tabular-nums">{totalItems} items</span>
              <span className="rounded-full border border-white/20 bg-white/[0.07] px-3 py-1 tabular-nums">{menu.length} categories</span>
              <span className="rounded-full border border-white/20 bg-white/[0.07] px-3 py-1">prices in €</span>
            </div>
          </div>
        </div>

        {/* category ticker */}
        <div className="relative border-t border-white/15 bg-black/15 py-2.5 overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-6 whitespace-nowrap pr-6">
            {[...navItems, ...navItems].map((item, i) => (
              <span key={`${item.id}-${i}`} aria-hidden={i >= navItems.length} className="flex items-center gap-6 text-[11px] font-medium tracking-[0.24em] text-white/60">
                {item.label}
                <span className="h-1 w-1 rotate-45 bg-[var(--gold)]/80" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Floating sticky catalog bar */}
      <div className="sticky top-3 z-30 mx-auto max-w-[1160px] px-3 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-black/10 bg-[var(--cream)]/90 shadow-[0_12px_40px_-16px_rgba(22,63,26,0.35)] backdrop-blur-xl">
          <div className="px-4 sm:px-5">
            <div className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden sm:grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--green)] font-serif text-[13px] text-[var(--cream)]">Μ</span>
                <p className="hidden sm:block text-[11px] tracking-[0.18em] font-semibold text-black">PRODUCT CATALOG</p>
                <p className="sm:hidden text-[11px] tracking-[0.18em] font-semibold">CATALOG</p>
                <span className="hidden sm:inline h-3 w-px bg-black/20" />
                <p className="truncate text-[11px] tracking-wide text-black/60">{totalItems} items • {menu.length} categories</p>
              </div>
              <div className="relative shrink-0">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.2-4.2m1.8-5.3a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search whisky, gin, beer..."
                  className="h-9 w-[170px] sm:w-[250px] rounded-full border border-black/15 bg-white pl-8 pr-8 text-[13px] placeholder:text-black/40 focus:outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/25 transition-shadow"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-black/10 text-[11px] leading-none text-black/60 hover:bg-black/20"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-hide -mx-1 px-1 scroll-smooth">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  data-nav-id={item.id}
                  onClick={() => scrollTo(item.id)}
                  className={`whitespace-nowrap cursor-pointer rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] transition-all ${
                    activeId === item.id
                      ? "bg-[var(--green)] text-white border-[var(--green)] shadow-[0_6px_16px_-6px_rgba(22,63,26,0.7)]"
                      : "bg-white text-black/70 border-black/10 hover:border-[var(--green)]/40 hover:text-[var(--green)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-serif text-2xl text-black/70">No results for “{query}”</p>
            <p className="mt-2 text-sm text-black/50">Try searching “Gin”, “Tullamore” or “IPA”</p>
            <button onClick={() => setQuery("")} className="mt-6 cursor-pointer rounded-full bg-[var(--green)] px-6 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_-10px_rgba(22,63,26,0.8)] hover:bg-[var(--green-2)] transition-colors">
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {filtered.map((category, idx) => (
              <section key={category.id} id={category.id} className="scroll-mt-44 rounded-[28px] bg-white/85 border border-black/[0.06] p-5 sm:p-8 shadow-[0_20px_50px_-30px_rgba(22,63,26,0.35)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-5 mb-6 sm:mb-8">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="hidden sm:inline font-serif italic text-sm text-[var(--gold)]">0{idx + 1}</span>
                      <h2 className="font-serif text-[30px] sm:text-[36px] lg:text-[42px] font-medium tracking-[-0.02em] leading-none text-black">{category.title}</h2>
                    </div>
                    {category.subtitle && (
                      <p className="mt-2 text-[11px] tracking-[0.14em] uppercase text-black/40 font-medium ml-0 sm:ml-8">{category.subtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--green)]/[0.08] border border-[var(--green)]/15 px-3 py-1 text-[10px] font-semibold tracking-wide text-[var(--green)] tabular-nums">
                    {category.subcategories.reduce((a, s) => a + s.items.length, 0)} items
                  </span>
                </div>

                <div className="space-y-8">
                  {category.subcategories.map((sub) => (
                    <div key={sub.label ?? "main"}>
                      {sub.label && (
                        <h3 className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--green)]/[0.07] border border-[var(--green)]/10 px-3 py-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
                          <span className="text-[11px] font-bold tracking-[0.18em] text-[var(--green)]">{sub.label}</span>
                        </h3>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-0">
                        {sub.items.map((item) => (
                          <div key={item.name} className="group flex items-baseline justify-between gap-3 border-b border-dotted border-black/15 px-3 -mx-3 py-3.5 transition-colors hover:bg-[var(--cream)]/70 rounded-lg hover:border-transparent">
                            <div className="flex-1 min-w-0 flex items-baseline gap-2">
                              <span className="text-[13.5px] sm:text-[14px] leading-snug font-medium text-black tracking-[-0.01em] group-hover:text-[var(--green)] transition-colors">
                                {item.name}
                                {item.note && <span className="ml-2 text-[11px] font-normal text-black/40">— {item.note}</span>}
                              </span>
                            </div>
                            <span className="shrink-0 rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[13px] font-semibold tracking-tight text-black tabular-nums group-hover:bg-[var(--green)] group-hover:text-white transition-colors">{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Visit — deep green panel */}
            <div className="relative overflow-hidden rounded-[28px] bg-[var(--green)] p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-[0_24px_60px_-24px_rgba(22,63,26,0.7)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.1]"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "20px 20px",
                }}
              />
              <span aria-hidden className="pointer-events-none absolute -right-4 -bottom-10 select-none font-serif text-[11rem] leading-none text-white/[0.06]">Μ</span>
              <div className="relative">
                <p className="text-[11px] tracking-[0.22em] font-semibold text-[var(--gold)]">VISIT US</p>
                <p className="mt-2 font-serif text-2xl sm:text-3xl text-[var(--cream)]">Βασιλέως Κωνσταντίνου 26, Ξάνθη</p>
                <p className="mt-2 text-sm text-white/65">Open daily — full menu available at the bar. Prices in €.</p>
              </div>
              <div className="relative flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-4 py-2 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold tracking-[0.14em] text-white/90">ΜΠΕΛΦΑΣΤ URBAN PUB</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer — deep green */}
      <footer className="mt-8 bg-[var(--green)] text-[var(--cream)]">
        <div className="h-px w-full bg-[var(--gold)]/40" />
        <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-8">
            <p className="font-serif text-2xl tracking-tight">ΜΠΕΛΦΑΣΤ</p>
            <p className="text-[11px] tracking-[0.2em] font-medium text-white/70">ΒΑΣΙΛΕΩΣ ΚΩΝΣΤΑΝΤΙΝΟΥ 26, ΞΑΝΘΗ</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/15 py-5 text-[11px] text-white/50">
            <p>Catalogue • {totalItems} items • All prices incl.</p>
            <p>© {new Date().getFullYear()} ΜΠΕΛΦΑΣΤ Urban Pub</p>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-[var(--green)] text-white shadow-[0_12px_28px_-8px_rgba(22,63,26,0.8)] transition-all hover:bg-[var(--green-2)] ${
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
