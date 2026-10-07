import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { hc } from "hono/client";
import type { AppType } from "server/app";
import { ENV } from "#/env";

/** Requests to the API give up after this long, so a hung API can't hang SSR. */
const API_TIMEOUT_MS = 10_000;

type Target = { baseUrl: string; headers: Record<string, string> };

/**
 * Where and how to call the API, resolved per environment.
 * - Server (SSR, loaders): directly at `API_URL`, forwarding the user's cookies (so the
 *   API sees their session) and IP (so rate limiting is per user, not per client server).
 * - Browser: same-origin `/`. The `/api/$` server route forwards those requests to the
 *   API, and the browser sends cookies itself.
 *
 * `createIsomorphicFn` strips the server branch (and its imports) from the browser bundle.
 */
const getTarget = createIsomorphicFn()
  .server((): Target => {
    const cookie = getRequestHeader("cookie");
    const ip = getRequestIP({ xForwardedFor: ENV.TRUST_PROXY });
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (ip) headers["x-forwarded-for"] = ip;
    // `API_URL` is `@dynamic` (read at runtime, not inlined) and server-only.
    return { baseUrl: ENV.API_URL, headers };
  })
  .client((): Target => ({ baseUrl: "/", headers: {} }));

/**
 * Typed API client (types come from `AppType`; no server code is imported).
 * Created per call so the target is resolved in the right environment and request, and
 * the timeout starts with the request.
 */
export const getApi = () => {
  const { baseUrl, headers } = getTarget();
  return hc<AppType>(baseUrl, { headers, init: { signal: AbortSignal.timeout(API_TIMEOUT_MS) } });
};
