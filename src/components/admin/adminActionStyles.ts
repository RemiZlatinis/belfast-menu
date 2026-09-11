import type { CSSProperties } from "react";

/**
 * Shared style for top-right admin actions ("View site" + "Deploy site").
 * An `<a>` and a `<button>` never match with "the same" padding/font alone —
 * UA defaults differ (font inheritance, line-height, box-sizing, appearance).
 * Keep one object here so the two stay pixel-identical.
 */
export const adminActionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "6px",
  border: "1px solid currentColor",
  background: "transparent",
  color: "inherit",
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: "20px",
  padding: "6px 12px",
  fontFamily: "inherit",
  margin: 0,
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  textDecoration: "none",
  appearance: "none",
  verticalAlign: "middle",
};
