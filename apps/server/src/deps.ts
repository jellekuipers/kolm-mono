import type { Auth } from "auth";
import type { HealthDeps } from "core/health";
import type { NotesDeps } from "core/notes";
import type { Db, Note } from "db";

/** The app's optional services and settings. Each feature that needs a service is off until it's provided. */
export interface AppDeps {
  db?: Db;
  auth?: Auth;
  /** Origins allowed to call `/mcp` from a browser. Requests without `Origin` are always allowed. */
  mcpAllowedOrigins?: string[];
  /** Requests per minute per client IP on `/api` and `/mcp` (default 300). */
  rateLimit?: number;
}

/** What the readiness check needs, derived from the app's services. */
export const healthDeps = ({ db, auth }: AppDeps): HealthDeps => ({
  pingDatabase: db && (() => db.$queryRaw`SELECT 1`),
  authEnabled: Boolean(auth),
});

/** Shown when a notes endpoint or tool is used without a database. */
export const NOTES_DISABLED = "Notes need a database (set DATABASE_URL)";

/** Maps a stored note to the `Note` shape (dates as ISO strings). Picks fields, so `authorId` stays private. */
const toNote = ({ id, title, body, createdAt }: Note) => ({
  id,
  title,
  body,
  createdAt: createdAt.toISOString(),
});

/** What the notes functions need, backed by the database. `undefined` when there's no database. */
export const notesDeps = ({ db }: AppDeps): NotesDeps | undefined =>
  db && {
    findNotes: async ({ query, limit }) => {
      const rows = await db.note.findMany({
        where: query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { body: { contains: query, mode: "insensitive" } },
              ],
            }
          : undefined,
        // `id` breaks ties, so notes created in the same millisecond keep a stable order.
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
      });
      return rows.map(toNote);
    },
    insertNote: async (input, authorId) =>
      toNote(await db.note.create({ data: { ...input, authorId } })),
  };
