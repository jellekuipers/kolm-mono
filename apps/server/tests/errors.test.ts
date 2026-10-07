import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { expect, test } from "vite-plus/test";
import { ApiError, handleError } from "../src/errors.ts";

// A throwaway app using the real error handler.
const app = new Hono()
  .onError(handleError)
  .get("/api-error", () => {
    throw new ApiError(422, "invalid_range", "Bad range");
  })
  .get("/http-exception", () => {
    throw new HTTPException(401, { message: "Unauthorized" });
  })
  .get("/bug", () => {
    throw new Error("db password is hunter2");
  });

test("ApiError keeps its status, code and message", async () => {
  const res = await app.request("/api-error");
  expect(res.status).toBe(422);
  expect(await res.json()).toEqual({ error: { code: "invalid_range", message: "Bad range" } });
});

test("HTTPException keeps its status", async () => {
  const res = await app.request("/http-exception");
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: { code: "http_error", message: "Unauthorized" } });
});

test("unexpected errors become a generic 500 without internals", async () => {
  const res = await app.request("/bug");
  expect(res.status).toBe(500);
  const text = await res.text();
  expect(JSON.parse(text)).toEqual({
    error: { code: "internal", message: "Internal server error" },
  });
  expect(text).not.toContain("hunter2");
});
