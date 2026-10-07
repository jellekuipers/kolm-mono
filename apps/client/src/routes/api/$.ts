import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP } from "@tanstack/react-start/server";
import { forwardToApi } from "#/lib/api-proxy";
import { ENV } from "#/env";

// Catch-all server route: forwards every `/api/*` request from the browser to the
// Hono API, in dev and production alike. SSR code skips this hop and calls the API directly.
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: ({ request }) =>
        forwardToApi(request, ENV.API_URL, {
          clientIp: getRequestIP({ xForwardedFor: ENV.TRUST_PROXY }),
        }),
    },
  },
});
