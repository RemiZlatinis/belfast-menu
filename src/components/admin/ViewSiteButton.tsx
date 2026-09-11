"use client";

import { adminActionStyle } from "./adminActionStyles";

/**
 * Top-right admin action: opens the main production site in a new tab.
 *
 * URL resolution (build-time, client-safe):
 * - NEXT_PUBLIC_SITE_URL when set (explicit production override), else
 * - https://belfast.remiservices.uk (canonical production domain).
 *
 * Deliberately NOT falling back to NEXT_PUBLIC_SERVER_URL: in local dev that
 * points at localhost, while this button must always land on production.
 */
const PRODUCTION_FALLBACK = "https://belfast.remiservices.uk";

function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return PRODUCTION_FALLBACK;
}

export function ViewSiteButton() {
  const href = resolveSiteUrl();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open the live site (${href}) in a new tab`}
      style={adminActionStyle}
    >
      View site
    </a>
  );
}
