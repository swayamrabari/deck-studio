/**
 * Deck media helper for slides. The runtime frame sets the base URL when a
 * deck loads; users reference uploaded assets by name:
 *
 *   <FitImage src={media("cover.jpg")} />
 *   <img src={media("logo.png")} />
 *
 * Absolute URLs and data URIs pass through untouched.
 */

let mediaBase = "";

export function setMediaBase(base: string) {
  mediaBase = base.endsWith("/") ? base : `${base}/`;
}

export function media(name: string): string {
  if (!name) return "";
  if (/^(https?:|data:|blob:)/i.test(name)) return name;
  const clean = name
    .replace(/^deck\/media\//, "")
    .replace(/^media\//, "")
    .replace(/^\/+/, "");
  return `${mediaBase}${encodeURIComponent(clean)}`;
}
