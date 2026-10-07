import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import type { AuthSession } from "auth";
import { Health, Liveness, getHealth, getLiveness } from "core/health";
import { logger, type Logger } from "core/logger";
import { CreateNoteInput, ListNotesInput, Note, NoteList, listNotes } from "core/notes";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { requestId, type RequestIdVariables } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { getConnInfo } from "@hono/node-server/conninfo";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";
import { NOTES_DISABLED, healthDeps, notesDeps, type AppDeps } from "./deps.ts";
import { ApiError, ErrorBody, errorBody, handleError, handleNotFound } from "./errors.ts";
import { handleMcpRequest } from "./mcp.ts";

type Env = { Variables: RequestIdVariables & { log: Logger } };

export type { AppDeps } from "./deps.ts";

/** Adds a request-scoped logger and logs one line per request. 5xx logs at error level. */
const logRequests: MiddlewareHandler<Env> = async (c, next) => {
  const start = performance.now();
  c.set("log", logger.child({ requestId: c.get("requestId") }));
  await next();
  const { status } = c.res;
  c.var.log[status >= 500 ? "error" : "info"]("request", {
    method: c.req.method,
    path: c.req.path,
    status,
    durationMs: Math.round(performance.now() - start),
  });
};

/** The socket address of the caller, or `undefined` without a Node socket (e.g. in tests). */
const socketAddress = (c: Context) => {
  try {
    return getConnInfo(c).remote.address;
  } catch {
    return undefined;
  }
};

/**
 * Limits requests to `limit` per minute per client IP. The IP comes from `x-forwarded-for`, which the client's
 * `/api` proxy (and SSR) set from the real socket address; the API only listens on
 * loopback, so it can't be spoofed from outside. Health checks are exempt, so probes
 * never get throttled.
 */
const limitRequests = (limit: number) =>
  rateLimiter<Env>({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-7",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || socketAddress(c) || "direct",
    skip: (c) => c.req.path.startsWith("/api/health/"),
    message: errorBody("rate_limited", "Too many requests, try again later"),
  });

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

// Liveness and readiness are separate so an orchestrator restarts the process only when
// it's stuck (live), and stops routing traffic to it while a dependency is down (ready).
const liveRoute = createRoute({
  method: "get",
  path: "/health/live",
  tags: ["system"],
  summary: "Liveness: the process is up (no dependency checks)",
  responses: {
    200: json(Liveness, "Alive"),
  },
});

const readyRoute = createRoute({
  method: "get",
  path: "/health/ready",
  tags: ["system"],
  summary: "Readiness: the API and its configured dependencies are up",
  responses: {
    200: json(Health, "Healthy"),
    503: json(Health, "A configured dependency is failing"),
  },
});

const User = z
  .object({ id: z.string(), name: z.string(), email: z.string(), image: z.string().nullish() })
  .meta({ id: "User" });

const meRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["auth"],
  summary: "The signed-in user",
  responses: {
    200: json(User, "The signed-in user"),
    401: json(ErrorBody, "Not signed in"),
  },
});

// The worked example (AGENTS.md, "Worked example: notes"). Anyone can read notes; adding
// one needs a signed-in user.
const listNotesRoute = createRoute({
  method: "get",
  path: "/notes",
  tags: ["notes"],
  summary: "List notes, newest first",
  request: {
    query: z.object({ q: ListNotesInput.shape.query, limit: ListNotesInput.shape.limit }),
  },
  responses: {
    200: json(NoteList, "The notes"),
    400: json(ErrorBody, "Invalid query"),
    503: json(ErrorBody, "No database is configured"),
  },
});

const createNoteRoute = createRoute({
  method: "post",
  path: "/notes",
  tags: ["notes"],
  summary: "Create a note",
  request: {
    body: { content: { "application/json": { schema: CreateNoteInput } }, required: true },
  },
  responses: {
    201: json(Note, "The new note"),
    400: json(ErrorBody, "Invalid note"),
    401: json(ErrorBody, "Not signed in"),
    503: json(ErrorBody, "No database is configured"),
  },
});

/**
 * Builds the app. Everything lives under `/api` except `/mcp`:
 * - `/api/*`: OpenAPI routes, chained on one expression so `AppType` carries their
 *   types to `hono/client`. Spec at `/api/openapi.json`, docs (Swagger UI) at `/api/docs`.
 * - `/api/auth/*`: better-auth, when `deps.auth` is set.
 * - `/mcp`: the MCP server (Streamable HTTP).
 */
export function createApp(deps: AppDeps = {}) {
  const { auth, mcpAllowedOrigins = [], rateLimit = 300 } = deps;

  /** The current session, or `null` (also when auth is disabled). */
  const getSession = async (c: Context): Promise<AuthSession | null> =>
    auth ? auth.api.getSession({ headers: c.req.raw.headers }) : null;

  /** The notes data access, or a 503 when there's no database. */
  const requireNotes = () => {
    const notes = notesDeps(deps);
    if (!notes) throw new ApiError(503, "database_disabled", NOTES_DISABLED);
    return notes;
  };

  const api = new OpenAPIHono<Env>({
    // Invalid input answers 400 in the shared error shape.
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(errorBody("validation", z.prettifyError(result.error)), 400);
      }
    },
  })
    .openapi(liveRoute, (c) => c.json(getLiveness(), 200))
    .openapi(readyRoute, async (c) => {
      const health = await getHealth(healthDeps(deps));
      return health.status === "ok" ? c.json(health, 200) : c.json(health, 503);
    })
    .openapi(meRoute, async (c) => {
      const session = await getSession(c);
      if (!session) throw new ApiError(401, "unauthorized", "Not signed in");
      const { id, name, email, image } = session.user;
      return c.json({ id, name, email, image }, 200);
    })
    .openapi(listNotesRoute, async (c) => {
      const { q, limit } = c.req.valid("query");
      return c.json(await listNotes(requireNotes(), { query: q, limit }), 200);
    })
    .openapi(createNoteRoute, async (c) => {
      if (!(await getSession(c))) throw new ApiError(401, "unauthorized", "Sign in to add notes");
      const note = await requireNotes().insertNote(c.req.valid("json"));
      return c.json(note, 201);
    });

  api.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: { title: "kolm-mono API", version: "0.0.0" },
    servers: [{ url: "/api" }],
  });

  const app = new Hono<Env>()
    .use(requestId())
    .use(logRequests)
    .use(secureHeaders())
    .use(limitRequests(rateLimit))
    .onError(handleError)
    .notFound(handleNotFound)
    .route("/api", api)
    .get("/api/docs", swaggerUI({ url: "/api/openapi.json", title: "kolm-mono API" }))
    // Answers preflights and adds CORS headers for allowed origins only. Unknown origins
    // get none and are still rejected with 403 below.
    .use("/mcp", cors({ origin: mcpAllowedOrigins, exposeHeaders: ["mcp-session-id"] }))
    .all("/mcp", (c) => {
      // MCP servers must validate Origin (DNS rebinding). Non-browser clients send none.
      const origin = c.req.header("origin");
      if (origin && !mcpAllowedOrigins.includes(origin)) {
        throw new ApiError(403, "forbidden_origin", "Origin not allowed");
      }
      return handleMcpRequest(c.req.raw, deps);
    });

  if (auth) app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  return app;
}

/** Import this type (type-only) in the client for end-to-end typed calls via `hono/client`. */
export type AppType = ReturnType<typeof createApp>;
