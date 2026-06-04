import type { Units } from "../../../shared/types";

/**
 * Display helpers. The API already returns values in the requested unit system
 * (we pass `units` through), so these are purely for labelling and formatting.
 */

export const tempUnit = (u: Units) => (u === "imperial" ? "°F" : "°C");
export const speedUnit = (u: Units) => (u === "imperial" ? "mph" : "m/s");

export function fmtTemp(v: number | undefined, u: Units): string {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}${tempUnit(u)}`;
}

export function fmtNum(v: number | undefined, suffix = ""): string {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return `${Math.round(v)}${suffix}`;
}

export function fmtPct(v: number | undefined): string {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  // Accept either 0..1 or 0..100.
  const pct = v <= 1 ? v * 100 : v;
  return `${Math.round(pct)}%`;
}

export function fmtDay(value: string | number | undefined): string {
  if (value === undefined) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function fmtHour(value: string | number | undefined): string {
  if (value === undefined) return "—";
  const d = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

/**
 * The API returns no condition text, only an icon URL like
 * ".../1_mainly_clear_day.svg". Derive a human label from the filename.
 */
export function conditionFromIcon(icon?: string, iconPath?: string): string {
  const src = icon || iconPath;
  if (!src) return "";
  const file = src.split("/").pop() || "";
  const stem = file.replace(/\.(svg|png|jpg)$/i, "");
  const words = stem
    .split(/[_-]/)
    .filter((w) => w && !/^\d+$/.test(w) && !/^(day|night|wmo|\d+)$/i.test(w));
  return words.join(" ");
}

/** Friendly place label: prefer an explicit label, else derive from timezone, else country. */
export function placeLabel(opts: { label?: string; timezone?: string; country?: string }): string {
  if (opts.label) return opts.label;
  if (opts.timezone?.includes("/")) {
    return opts.timezone.split("/").pop()!.replace(/_/g, " ");
  }
  return opts.country || "—";
}
