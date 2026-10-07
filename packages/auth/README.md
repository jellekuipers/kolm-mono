# auth

better-auth with "Sign in with GitHub" and sessions stored through the `db` package.
Optional: the server only enables it when `DATABASE_URL`, `BETTER_AUTH_SECRET`,
`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are all set.
It's mounted at `/api/auth/*`. The client reaches it through its `/api` proxy, so cookies stay first-party.

Add providers and plugins in `src/index.ts`, and add any tables they need to
`packages/db/prisma/schema.prisma`.
