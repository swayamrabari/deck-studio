import "server-only";

import { NextResponse } from "next/server";

/**
 * Shared JSON-body reading for route handlers. App Router handlers have no
 * built-in request-body limit (the 1 MB cap applies only to Server
 * Actions), so every JSON route goes through this size-guarded helper.
 */

export const MAX_JSON_BYTES = 1_000_000;

/**
 * Parses a JSON request body, or null when the body is missing, too large,
 * or malformed. Oversized bodies answer with a 413 response the caller can
 * return directly.
 */
export async function readJsonBody(
  request: Request
): Promise<{ data: Record<string, unknown> | null; error?: NextResponse }> {
  const lengthHeader = request.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_JSON_BYTES) {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      ),
    };
  }

  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      ),
    };
  }

  try {
    const parsed: unknown = JSON.parse(text || "null");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { data: null };
    }
    return { data: parsed as Record<string, unknown> };
  } catch {
    return { data: null };
  }
}

