/**
 * A same-site path to send the user to after signing in. Anything that isn't a plain
 * absolute path (`https://...`, `//evil.example`, `javascript:...`) falls back to `fallback`,
 * so a crafted `?redirect=` can't send users to another site.
 */
export function safeRedirect(target: string | undefined, fallback = "/profile"): string {
  if (!target?.startsWith("/")) return fallback;
  // Parse like a browser would: it strips tabs and newlines, so `/\t/evil.example` becomes
  // `//evil.example`. Only a result that stays on the dummy origin is same-site.
  const url = new URL(target, "http://x");
  return url.origin === "http://x" ? url.pathname + url.search + url.hash : fallback;
}
