import "server-only";

/** Media helpers shared by the upload and serve routes. */

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024; // 8 MB

/** Normalizes an uploaded file name to a safe, flat media name. */
export function sanitizeMediaName(raw: string): string | null {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/^\.+/, "");
  if (!cleaned || cleaned.length > 120) return null;
  return cleaned;
}
