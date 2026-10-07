import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { Db } from "db";

export interface AuthOptions {
  db: Db;
  /** At least 32 random characters (`openssl rand -base64 32`). */
  secret: string;
  /**
   * The origin users reach the app on, e.g. `http://localhost:3001`. Auth routes live
   * under `/api/auth`, which the client's `/api` proxy forwards to the server.
   */
  baseURL: string;
  /**
   * A GitHub OAuth app. Its callback URL must be `<baseURL>/api/auth/callback/github`.
   */
  github: { clientId: string; clientSecret: string };
}

/**
 * The better-auth instance: sign in with GitHub, sessions in the database. Add more
 * providers to `socialProviders` (each needs its own OAuth app) and plugins here; keep the
 * Prisma schema (packages/db) in sync with the tables they need.
 */
export function createAuth({ db, secret, baseURL, github }: AuthOptions) {
  return betterAuth({
    appName: "kolm-mono",
    database: prismaAdapter(db, { provider: "postgresql" }),
    secret,
    baseURL,
    basePath: "/api/auth",
    trustedOrigins: [baseURL],
    socialProviders: { github },
    // Rate limiting and sessions key on the client IP. Requests reach the API through the
    // client's /api proxy, which sets this header from the real socket address.
    advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for"] } },
  });
}

export type Auth = ReturnType<typeof createAuth>;
/** The signed-in user and session, as returned by `auth.api.getSession`. */
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
