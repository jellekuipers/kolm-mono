// Load `core` before the app, as `src/index.ts` does: schemas must not depend on import order.
import "core/health";
import "core/notes";
import type { Auth } from "auth";
import type { Db } from "db";
import { expect, test, vi } from "vite-plus/test";
import { createApp } from "../src/app.ts";

// Only `$queryRaw` is used, by the health check's database ping.
const fakeDb = (ping: () => Promise<unknown>) => ({ $queryRaw: ping }) as unknown as Db;

test("GET /api/health/ready without a database", async () => {
  const res = await createApp().request("/api/health/ready");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok", checks: { database: "disabled" } });
});

test("GET /api/health/ready with a database that answers", async () => {
  const app = createApp({ db: fakeDb(() => Promise.resolve([{ "?column?": 1 }])) });
  const res = await app.request("/api/health/ready");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok", checks: { database: "ok" } });
});

test("GET /api/health/ready answers 503 when the database is down", async () => {
  const app = createApp({ db: fakeDb(() => Promise.reject(new Error("ECONNREFUSED"))) });
  const res = await app.request("/api/health/ready");
  expect(res.status).toBe(503);
  expect(await res.json()).toMatchObject({ status: "degraded", checks: { database: "error" } });
});

test("GET /api/health/live stays ok when the database is down", async () => {
  const app = createApp({ db: fakeDb(() => Promise.reject(new Error("ECONNREFUSED"))) });
  const res = await app.request("/api/health/live");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok" });
});

// Only `note.findMany` and `note.create`, used by the notes data access.
const fakeNotesDb = (note: Record<string, unknown>) => ({ note }) as unknown as Db;

// Only `api.getSession`, which answers as if someone is signed in.
const signedIn = {
  api: { getSession: () => Promise.resolve({ user: { id: "u1", name: "Ada", email: "a@b.c" } }) },
} as unknown as Auth;

const row = { id: "n1", title: "Hello", body: "First note", createdAt: new Date("2026-01-01") };

test("GET /api/notes lists notes from the database", async () => {
  const findMany = vi.fn(() => Promise.resolve([row]));
  const app = createApp({ db: fakeNotesDb({ findMany }) });
  const res = await app.request("/api/notes?limit=5");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({
    notes: [{ ...row, createdAt: "2026-01-01T00:00:00.000Z" }],
  });
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, where: undefined }));
});

test("GET /api/notes?q= searches title and body", async () => {
  const findMany = vi.fn(() => Promise.resolve([]));
  const app = createApp({ db: fakeNotesDb({ findMany }) });
  await app.request("/api/notes?q=hello");
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      take: 20,
      where: { OR: [expect.anything(), expect.anything()] },
    }),
  );
});

test("GET /api/notes rejects an invalid limit with 400", async () => {
  const app = createApp({ db: fakeNotesDb({ findMany: vi.fn() }) });
  const res = await app.request("/api/notes?limit=500");
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ error: { code: "validation" } });
});

test("POST /api/notes creates a note", async () => {
  const create = vi.fn(({ data }: { data: object }) => Promise.resolve({ ...row, ...data }));
  const app = createApp({ db: fakeNotesDb({ create }), auth: signedIn });
  const res = await app.request("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "  New ", body: "Text" }),
  });
  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body).toMatchObject({ title: "New", body: "Text" });
  // The author is stored, but its user ID isn't returned.
  expect(create).toHaveBeenCalledWith({ data: { title: "New", body: "Text", authorId: "u1" } });
  expect(body).not.toHaveProperty("authorId");
});

test("POST /api/notes rejects an empty title with 400", async () => {
  const create = vi.fn();
  const app = createApp({ db: fakeNotesDb({ create }), auth: signedIn });
  const res = await app.request("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "  ", body: "Text" }),
  });
  expect(res.status).toBe(400);
  expect(await res.json()).toMatchObject({ error: { code: "validation" } });
  expect(create).not.toHaveBeenCalled();
});

test("POST /api/notes answers 401 when signed out", async () => {
  const create = vi.fn();
  const app = createApp({ db: fakeNotesDb({ create }) });
  const res = await app.request("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "A", body: "B" }),
  });
  expect(res.status).toBe(401);
  expect(await res.json()).toMatchObject({ error: { code: "unauthorized" } });
  expect(create).not.toHaveBeenCalled();
});

test("GET /api/notes answers 503 without a database", async () => {
  const res = await createApp().request("/api/notes");
  expect(res.status).toBe(503);
  expect(await res.json()).toMatchObject({ error: { code: "database_disabled" } });
});

test("GET /api/me is 401 without a session (auth disabled)", async () => {
  const res = await createApp().request("/api/me");
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: { code: "unauthorized", message: "Not signed in" } });
});

test("auth routes are not mounted when auth is disabled", async () => {
  const res = await createApp().request("/api/auth/get-session");
  expect(res.status).toBe(404);
});

test("GET /api/openapi.json describes the routes and named schemas", async () => {
  const res = await createApp().request("/api/openapi.json");
  const spec = (await res.json()) as {
    paths: Record<string, unknown>;
    components: { schemas: Record<string, unknown> };
  };
  expect(Object.keys(spec.paths)).toEqual(
    expect.arrayContaining(["/health/live", "/health/ready", "/me", "/notes"]),
  );
  expect(Object.keys(spec.components.schemas)).toEqual(
    expect.arrayContaining(["Liveness", "Health", "Error", "User", "Note", "CreateNoteInput"]),
  );
});

test("readiness reports whether auth is configured", async () => {
  const res = await createApp().request("/api/health/ready");
  expect(await res.json()).toMatchObject({ checks: { auth: "disabled" } });
});

test("responses carry security headers", async () => {
  const res = await createApp().request("/api/health/live");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
});

test("requests are rate limited per client IP, liveness excepted", async () => {
  const app = createApp({ rateLimit: 2 });
  const get = (path: string, ip: string) =>
    app.request(path, { headers: { "x-forwarded-for": ip } });

  expect((await get("/api/me", "203.0.113.1")).status).toBe(401);
  expect((await get("/api/me", "203.0.113.1")).status).toBe(401);
  const limited = await get("/api/me", "203.0.113.1");
  expect(limited.status).toBe(429);
  expect(await limited.json()).toEqual({
    error: { code: "rate_limited", message: "Too many requests, try again later" },
  });
  // Other clients and liveness are unaffected; readiness (it pings the database) is limited.
  expect((await get("/api/me", "203.0.113.2")).status).toBe(401);
  expect((await get("/api/health/live", "203.0.113.1")).status).toBe(200);
  expect((await get("/api/health/ready", "203.0.113.1")).status).toBe(429);
});

test("every response carries a request ID", async () => {
  const res = await createApp().request("/api/health/ready");
  expect(res.headers.get("x-request-id")).toBeTruthy();
});

test("unknown routes 404 with the JSON error shape", async () => {
  const res = await createApp().request("/api/nope");
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: { code: "not_found", message: "Not found" } });
});
