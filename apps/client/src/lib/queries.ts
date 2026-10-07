import { queryOptions } from "@tanstack/react-query";
import { getApi } from "#/lib/api";
import { toApiError } from "#/lib/api-error";

// Query definitions shared by route loaders (prefetch during SSR with
// `context.queryClient.query`) and components (`useSuspenseQuery`). One per
// endpoint; include every parameter in the `queryKey`.

/** `GET /api/health/ready`. A 503 still carries a health report (status `degraded`), so it isn't an error here. */
export const healthQueryOptions = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const res = await getApi().api.health.ready.$get();
    if (res.status !== 200 && res.status !== 503) throw await toApiError(res);
    return res.json();
  },
  refetchInterval: 30_000,
});

/** `GET /api/me`: the signed-in user, or `null` when signed out (or auth is disabled). */
export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const res = await getApi().api.me.$get();
    if (res.status === 401) return null;
    if (!res.ok) throw await toApiError(res);
    return res.json();
  },
});

/** `GET /api/notes`: the newest notes (the worked example). Fails with code `database_disabled` (503) without a database. */
export const notesQueryOptions = queryOptions({
  queryKey: ["notes"],
  queryFn: async () => {
    const res = await getApi().api.notes.$get({ query: {} });
    if (!res.ok) throw await toApiError(res);
    return res.json();
  },
});
