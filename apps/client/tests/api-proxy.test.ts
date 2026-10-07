import { Hono } from "hono";
import { expect, test } from "vite-plus/test";
import { forwardToApi } from "../src/lib/api-proxy.ts";

// A stand-in upstream API, called in-process instead of over the network.
const upstream = new Hono()
  .get("/api/echo", (c) =>
    c.json({ url: c.req.url, host: c.req.header("host") ?? null, auth: c.req.header("x-test") }),
  )
  .get("/api/forwarded", (c) =>
    c.json({
      for: c.req.header("x-forwarded-for") ?? null,
      host: c.req.header("x-forwarded-host"),
      proto: c.req.header("x-forwarded-proto"),
    }),
  )
  .post("/api/echo", async (c) => c.json({ body: await c.req.json() }, 201))
  .get("/api/gzip", (c) => c.body("plain", 200, { "content-encoding": "gzip" }));
const fetch = (request: Request) => Promise.resolve(upstream.fetch(request));

test("forwards path, query and headers to the API", async () => {
  const request = new Request("http://client.local/api/echo?range=7d", {
    headers: { "x-test": "yes" },
  });
  const response = await forwardToApi(request, "http://api.local:3000", { fetch });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    url: "http://api.local:3000/api/echo?range=7d",
    host: null,
    auth: "yes",
  });
});

test("forwards the method, body and status", async () => {
  const request = new Request("http://client.local/api/echo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ a: 1 }),
  });
  const response = await forwardToApi(request, "http://api.local", { fetch });
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ body: { a: 1 } });
});

test("drops encoding headers that no longer match the body", async () => {
  const response = await forwardToApi(
    new Request("http://client.local/api/gzip"),
    "http://api.local",
    { fetch },
  );
  expect(response.headers.get("content-encoding")).toBeNull();
  expect(await response.text()).toBe("plain");
});

test("answers 502 when the API is unreachable", async () => {
  const response = await forwardToApi(
    new Request("http://client.local/api/x"),
    "http://api.local",
    { fetch: () => Promise.reject(new TypeError("fetch failed")) },
  );
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({
    error: { code: "api_unreachable", message: "API unreachable" },
  });
});

test("sets x-forwarded-* from the real client, not from what the browser sent", async () => {
  const request = new Request("https://app.example/api/forwarded", {
    headers: { "x-forwarded-for": "6.6.6.6" },
  });
  const response = await forwardToApi(request, "http://api.local", {
    fetch,
    clientIp: "203.0.113.7",
  });
  expect(await response.json()).toEqual({
    for: "203.0.113.7",
    host: "app.example",
    proto: "https",
  });
});

test("drops a spoofed x-forwarded-for when the client IP is unknown", async () => {
  const request = new Request("http://client.local/api/forwarded", {
    headers: { "x-forwarded-for": "6.6.6.6" },
  });
  const response = await forwardToApi(request, "http://api.local", { fetch });
  expect(await response.json()).toMatchObject({ for: null });
});
