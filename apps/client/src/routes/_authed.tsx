import { createFileRoute, redirect } from "@tanstack/react-router";
import { meQueryOptions } from "#/lib/queries";

// Layout route for pages that need a signed-in user: put them in `routes/_authed/`.
// Signed-out visitors go to the sign-in page and come back afterwards.
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.query(meQueryOptions);
    if (!me) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    return { me };
  },
});
