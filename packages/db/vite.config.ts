import { defineConfig } from "vite-plus";

// Tasks that touch the database or run interactively are never cached: caching would
// replay old output, and cached tasks don't see the shell's env (e.g. DATABASE_URL).
// They run through `varlock run`, which loads DATABASE_URL and POSTGRES_PORT.
const live = (command: string) => ({ command: `varlock run -- ${command}`, cache: false });

export default defineConfig({
  run: {
    tasks: {
      // Cached: reruns only when the schema or config changes. Also runs on install.
      generate: { command: "prisma generate", cache: { input: ["prisma/**", "prisma.config.ts"] } },
      // Create and apply a migration from schema changes, and regenerate the client (dev).
      migrate: live("prisma migrate dev"),
      // Apply pending migrations (production, CI).
      deploy: live("prisma migrate deploy"),
      // Fill the database with the fixtures in prisma/seed.ts.
      seed: live("prisma db seed"),
      studio: live("prisma studio"),
      // Local Postgres (compose.yaml).
      up: live("docker compose up -d --wait"),
      down: live("docker compose down"),
    },
  },
});
