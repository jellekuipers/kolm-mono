import { createAuthClient } from "better-auth/react";

let client: ReturnType<typeof createAuthClient> | undefined;

/**
 * The better-auth client. Browser only: it calls same-origin `/api/auth/*` (forwarded to
 * the API by the `/api` proxy), so the auth cookies are first-party. Use it in event
 * handlers (sign in, sign out, update the user); read the session with `meQueryOptions`.
 */
export function getAuthClient() {
  client ??= createAuthClient();
  return client;
}
