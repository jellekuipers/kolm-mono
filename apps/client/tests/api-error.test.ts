import { expect, test } from "vite-plus/test";
import { toApiError } from "../src/lib/api-error.ts";

test("uses the API's error message and code", async () => {
  const res = Response.json(
    { error: { code: "invalid_range", message: "Bad range" } },
    { status: 422 },
  );
  const error = await toApiError(res);
  expect([error.message, error.code, error.status]).toEqual(["Bad range", "invalid_range", 422]);
});

test("falls back to the HTTP status for non-JSON bodies", async () => {
  const error = await toApiError(new Response("<html>", { status: 503 }));
  expect([error.message, error.code]).toEqual(["HTTP 503", "http_error"]);
});
