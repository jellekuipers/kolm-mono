import { Container } from "@chakra-ui/react/container";
import { Heading } from "@chakra-ui/react/heading";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { AppHeader } from "#/components/app-header";
import { meQueryOptions } from "#/lib/queries";
import { Provider } from "#/components/ui/provider";
import type { QueryClient } from "@tanstack/react-query";

/** Context available to every route's `loader`/`beforeLoad`, created in `getRouter`. */
interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "kolm-mono",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
      },
    ],
  }),
  // Prefetch the session for the header. Never fails the page: the header copes without it.
  loader: ({ context }) => context.queryClient.query(meQueryOptions).catch(() => null),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: () => (
    <Container paddingY="16">
      <Heading size="2xl">Not found</Heading>
    </Container>
  ),
});

function RootLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
    </>
  );
}

// The HTML shell, rendered on the server. `dark` + `colorScheme` fix the app to
// dark mode (no toggle).
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Provider>{children}</Provider>
        <Scripts />
      </body>
    </html>
  );
}
