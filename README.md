# kolm-mono

A starter monorepo for proofs of concept: a TanStack Start client and a Hono API with
typed calls end to end, an MCP server, validated env config (varlock), and optional
Postgres (Prisma) and "Sign in with GitHub" (better-auth).

This is a personal starting point, shared as is. Issues and pull requests aren't
actively maintained, but feel free to fork it.

| Package          | What                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `apps/client`    | TanStack Start + Chakra UI (dark), SSR, port 3001                        |
| `apps/server`    | Hono API on Node (no build): `/api` (docs at `/api/docs`), MCP at `/mcp` |
| `packages/core`  | Business logic shared by API routes and MCP tools; logger                |
| `packages/db`    | Prisma 7 + Postgres, local Postgres via docker compose (optional)        |
| `packages/auth`  | better-auth: sign in with GitHub (optional)                              |
| `apps/e2e`       | Playwright smoke tests                                                   |
| `tools/tsconfig` | Shared TypeScript configs                                                |

## How it fits together

The browser only talks to the client. Pages render on the client's server, whose
loaders call the API directly (forwarding the user's cookies). Browser-side calls go to
the client's own `/api`, which proxies them to the API, so there's no CORS and auth
cookies are first-party. The API's types flow to the client through `hono/client`.
API routes and MCP tools are thin wrappers around the same functions in
`packages/core`. Every environment variable is declared once, in `.env.schema`.
[AGENTS.md](AGENTS.md) has the details and conventions.

## Development

Requires Node 24+ and the [Vite+](https://viteplus.dev) `vp` CLI. The right pnpm version is
downloaded automatically.

```bash
vp install
```

Run server and client together, then open http://localhost:3001:

```bash
vp run dev
```

Check, test and build everything (what CI runs):

```bash
vp run ready
```

Optionally restore the AI agent skills listed in `skills-lock.json` (Hono,
better-auth, Prisma, MCP, Chakra UI, React, varlock):

```bash
vp run skills
```

## Configuration

Every environment variable is declared, typed and documented in
[.env.schema](.env.schema) ([varlock](https://varlock.dev)). The defaults work for
local development. Put local values and secrets in a root `.env.local` (gitignored),
and check the resolved config (secrets masked) with:

```bash
vp run env
```

The pre-commit hook runs `varlock scan`, which blocks commits that contain a secret
from your env in plaintext.

## Database and auth (optional)

Start a local Postgres (on 127.0.0.1 only), then set `DATABASE_URL` in `.env.local`
(see the example in `.env.schema`), apply the migrations and optionally seed:

```bash
vp run db:up
```

```bash
vp run db:migrate
```

```bash
vp run db:seed
```

For "Sign in with GitHub", create an OAuth app at
https://github.com/settings/developers with homepage `http://localhost:3001` and
callback URL `http://localhost:3001/api/auth/callback/github`. Then set
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `BETTER_AUTH_SECRET` in `.env.local`.
To generate the secret and encrypt it:

```bash
openssl rand -base64 32 | vpx varlock encrypt
```

The sign-in page explains what's still missing while auth is off.

## Tests

Unit tests run as part of `vp run ready`. The Playwright smoke tests start the dev
servers themselves (download Chromium once first):

```bash
vp run e2e:install
```

```bash
vp run e2e
```

## MCP

The API serves an MCP server (Streamable HTTP) at `http://127.0.0.1:3000/mcp`. To add
it to Claude Code:

```bash
claude mcp add --transport http kolm-mono http://127.0.0.1:3000/mcp
```

## Before you deploy

This is a development starter; nothing here is hardened for production yet.

- **Don't expose the API directly.** It trusts `x-forwarded-*` headers (for the client
  IP behind the client's `/api` proxy), so it listens on 127.0.0.1 by default. Only set
  `API_HOST=0.0.0.0` behind a proxy that overwrites those headers.
- **`/mcp` has no authentication.** Anyone who can reach it can call its tools. Keep
  tools read-only and non-sensitive, or add auth first.
- **Public endpoints:** `/api/health/*` reports uptime and dependency status, and
  `/api/docs` describes every route. Rate limiting is per process and in memory (`API_RATE_LIMIT` requests a minute per IP).

## License

[MIT](LICENSE)
