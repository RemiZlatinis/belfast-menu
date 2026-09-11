"use client";

import { useRowLabel } from "@payloadcms/ui";

/**
 * Compact row labels so a 144-drink catalogue stays scannable:
 * Category shows "BEVERAGES · 3 groups", Group shows "SCOTCH · 12 drinks",
 * Drink shows "Jameson — 28€ · sold out".
 * No DB change — admin display only.
 */

export function CategoryRowLabel() {
  const { data } = useRowLabel<{ title?: string; slug?: string; subcategories?: unknown[] }>();
  const title = data?.title || data?.slug || "Category";
  const count = Array.isArray(data?.subcategories) ? data.subcategories.length : 0;
  return <span>{`${title}${count ? ` · ${count} group${count === 1 ? "" : "s"}` : ""}`}</span>;
}

export function GroupRowLabel() {
  const { data } = useRowLabel<{ label?: string; items?: unknown[] }>();
  const label = data?.label?.trim() || "(single list)";
  const count = Array.isArray(data?.items) ? data.items.length : 0;
  return <span>{`${label}${count ? ` · ${count} drink${count === 1 ? "" : "s"}` : ""}`}</span>;
}

export function DrinkRowLabel() {
  const { data } = useRowLabel<{ name?: string; price?: string; available?: boolean }>();
  const name = data?.name || "Drink";
  const price = data?.price ? ` — ${data.price}` : "";
  const soldOut = data?.available === false ? " · sold out" : "";
  return <span>{`${name}${price}${soldOut}`}</span>;
}
