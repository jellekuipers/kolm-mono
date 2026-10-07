/**
 * Turns a non-OK API response into an `Error` carrying the API's message and code
 * (`{ error: { code, message } }`), falling back to the HTTP status. Throw it from a `queryFn`.
 */
export async function toApiError(res: { status: number; json(): Promise<unknown> }) {
  const body = (await res.json().catch(() => undefined)) as
    | { error?: { code?: string; message?: string } }
    | undefined;
  return Object.assign(new Error(body?.error?.message ?? `HTTP ${res.status}`), {
    code: body?.error?.code ?? "http_error",
    status: res.status,
  });
}
