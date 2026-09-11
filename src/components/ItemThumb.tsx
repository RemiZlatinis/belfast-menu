"use client";

import { useState } from "react";
import menuImages from "@/lib/menu-images.json";

const photoMap = menuImages as Record<string, string>;

/**
 * Product thumbnail (52px, lazy). Lookup is "<categoryId>::<item name>" so it
 * works in both languages with zero code changes per product.
 * Missing/broken photo → elegant monogram tile (same footprint, no CLS).
 */
export function ItemThumb({
  catId,
  name,
  soldOut,
}: {
  catId: string;
  name: string;
  soldOut: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const src = photoMap[`${catId}::${name}`];
  const letter = (name.trim().charAt(0) || "Μ").toUpperCase();

  if (!src || broken) {
    return (
      <span
        aria-hidden
        className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-[var(--green)]/[0.08] font-serif text-[22px] text-[var(--green)] ring-1 ring-[var(--green)]/15 ${
          soldOut ? "opacity-50 grayscale" : ""
        }`}
      >
        {letter}
      </span>
    );
  }
  return (
    // Plain <img> is deliberate: 130 pre-resized 512px WebPs, all lazy —
    // next/image would add 130 optimizer variants with no visual benefit.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden
      width={104}
      height={104}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={`h-[52px] w-[52px] shrink-0 rounded-xl bg-[var(--cream)] object-cover ring-1 ring-black/10 ${
        soldOut ? "opacity-50 grayscale" : ""
      }`}
    />
  );
}
