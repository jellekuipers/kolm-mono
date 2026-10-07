import { z } from "zod";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { logger } from "core/logger";

/** The JSON body of every error response: `{ error: { code, message } }`. */
export const ErrorBody = z
  .object({ error: z.object({ code: z.string(), message: z.string() }) })
  .meta({ id: "Error" });
export type ErrorBody = z.infer<typeof ErrorBody>;

/**
 * An expected, client-facing error. Throw it from a handler and `handleError`
 * answers with `status` and `{ error: { code, message } }`.
 * `message` is shown to clients, so never put internals or secrets in it.
 */
export class ApiError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const errorBody = (code: string, message: string): ErrorBody => ({
  error: { code, message },
});

/**
 * The app's `onError`. Expected errors (`ApiError`, Hono's `HTTPException`) keep their
 * status and message. Anything else is a bug: it's logged with its stack and the client
 * gets a generic 500, so internals never leak.
 */
export const handleError = (error: Error, c: Context) => {
  if (error instanceof ApiError) return c.json(errorBody(error.code, error.message), error.status);
  if (error instanceof HTTPException) {
    return c.json(errorBody("http_error", error.message), error.status as ContentfulStatusCode);
  }
  const log = (c.get("log") as typeof logger | undefined) ?? logger;
  log.error("unhandled error", { err: error });
  return c.json(errorBody("internal", "Internal server error"), 500);
};

/** The app's `notFound`: same JSON shape as every other error. */
export const handleNotFound = (c: Context) => c.json(errorBody("not_found", "Not found"), 404);
