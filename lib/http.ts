// Safe JSON fetch for client components — a non-ok or empty response body
// (transient errors, an unauthenticated 401 with no body, a route still
// compiling in dev) must not throw and crash the whole component tree.
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return null;
  }

  const text = await res.text();
  if (!res.ok || !text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// The API returns `{ error: string }` for business-rule rejections and
// `{ error: { fieldErrors } }` for schema failures — only the former is
// displayable, so fall back to a generic message for anything else.
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}
