/** Link token for `taste-lab serve --lan`. Loopback mode never has one. */
export const TOKEN_KEY = "taste-lab.token";
export const TOKEN_HEADER = "X-Taste-Token";
export const UNAUTHORIZED_MESSAGE =
  "Open the link printed by `taste-lab serve --lan`";

type Store = Pick<Storage, "getItem" | "setItem">;

/**
 * Reads `k` from a query string. When present, stores it and returns the
 * address without `k` (path, other params and hash kept), so the caller can
 * clean the address bar. Returns null when there is no `k`.
 */
export function captureToken(
  href: string,
  store: Store,
): { token: string; cleanUrl: string } | null {
  const url = new URL(href);
  const token = url.searchParams.get("k");
  if (!token) return null;
  try {
    store.setItem(TOKEN_KEY, token);
  } catch {
    // Storage can be blocked. The token still works until reload.
  }
  url.searchParams.delete("k");
  return { token, cleanUrl: `${url.pathname}${url.search}${url.hash}` };
}

export function storedToken(store: Store): string | null {
  try {
    return store.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Request headers: the token header when a token is stored, nothing in loopback mode. */
export function tokenHeaders(store: Store): Record<string, string> {
  const token = storedToken(store);
  return token ? { [TOKEN_HEADER]: token } : {};
}
