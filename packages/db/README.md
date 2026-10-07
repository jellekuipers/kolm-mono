# db

Prisma 7 with Postgres (`@prisma/adapter-pg`). Optional: the server only creates a
client when `DATABASE_URL` is set.

- `prisma/schema.prisma`: the schema. It starts with the tables better-auth needs.
- `prisma/migrations`: committed migrations.
- `src/generated`: the generated client (gitignored), created on install and by `vp run db#generate`.
- `src/index.ts`: `createDb(url)` and the generated types.
- `compose.yaml`: a local Postgres on `POSTGRES_PORT`.

Tasks (`vite.config.ts`) run Prisma and docker compose through `varlock run`, which
supplies `DATABASE_URL` and `POSTGRES_PORT` from the env schema:
`vp run db#up`, `db#down`, `db#migrate`, `db#deploy` and `db#studio`.
