import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

export * from "./generated/prisma/client.ts";

/** The Prisma client type. Code that needs the database takes it as a parameter. */
export type Db = PrismaClient;

/**
 * Creates a Prisma client for the Postgres database at `url`. Create one per process
 * (it holds a connection pool) and `$disconnect()` it on shutdown.
 */
export function createDb(url: string): Db {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
