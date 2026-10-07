import { defineConfig } from "prisma/config";

// Run the Prisma CLI through `varlock run` (see package.json scripts), which loads and
// validates DATABASE_URL from the workspace's .env files.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "node prisma/seed.ts" },
  // Optional so `prisma generate` (run on install) works without a database.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
