// Loads and validates the environment (.env.schema) before anything reads it.
import "varlock/auto-load";
import { serve } from "@hono/node-server";
import { createAuth } from "auth";
import { logger } from "core/logger";
import { createDb } from "db";
import { createApp } from "./app.ts";
import { ENV } from "./env.ts";

// Optional services are enabled by their environment variables (see /.env.schema).
const db = ENV.DATABASE_URL ? createDb(ENV.DATABASE_URL) : undefined;

// Auth needs the database, a secret and a GitHub OAuth app. Warn about partial setups.
const authEnv = {
  BETTER_AUTH_SECRET: ENV.BETTER_AUTH_SECRET,
  GITHUB_CLIENT_ID: ENV.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: ENV.GITHUB_CLIENT_SECRET,
};
const missing = Object.entries(authEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0 && missing.length < Object.keys(authEnv).length) {
  logger.warn("auth disabled: incomplete config", { missing: missing.join(",") });
} else if (missing.length === 0 && !db) {
  logger.warn("auth disabled: DATABASE_URL is not set");
}
const auth =
  db && ENV.BETTER_AUTH_SECRET && ENV.GITHUB_CLIENT_ID && ENV.GITHUB_CLIENT_SECRET
    ? createAuth({
        db,
        secret: ENV.BETTER_AUTH_SECRET,
        baseURL: ENV.BETTER_AUTH_URL,
        github: { clientId: ENV.GITHUB_CLIENT_ID, clientSecret: ENV.GITHUB_CLIENT_SECRET },
      })
    : undefined;

const app = createApp({
  db,
  auth,
  rateLimit: ENV.API_RATE_LIMIT,
  mcpAllowedOrigins: (ENV.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

const server = serve(
  { fetch: app.fetch, port: ENV.API_PORT, hostname: ENV.API_HOST },
  ({ address, port }) => {
    logger.info("listening", { address, port, database: Boolean(db), auth: Boolean(auth) });
  },
);

// Finish in-flight requests and close the database pool before exiting.
const shutdown = (signal: string) => {
  logger.info("shutting down", { signal });
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await db?.$disconnect();
    process.exit(0);
  });
};
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
