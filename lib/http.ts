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
