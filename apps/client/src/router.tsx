import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

// TanStack Start calls this once per request on the server and once in the browser,
// so each SSR request gets its own query cache.
// The SSR query integration dehydrates the loader-prefetched query cache into the
// HTML and hydrates it on the client, so `useSuspenseQuery` doesn't refetch.
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Data prefetched during SSR is treated as fresh for a while, so the
      // browser doesn't refetch it right after hydration.
      queries: { staleTime: 30_000 },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
