// Headers that describe a single connection or the original encoding. They must not
// be copied between the two hops: fetch already decoded the body and set its own framing.
const REQUEST_HEADERS_TO_DROP = ["host", "connection", "keep-alive", "content-length"];
const RESPONSE_HEADERS_TO_DROP = [
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-encoding",
  "content-length",
];

export interface ForwardOptions {
  /** The browser's IP (the socket address, not a header it sent). Becomes `x-forwarded-for`. */
  clientIp?: string;
  fetch?: (request: Request) => Promise<Response>;
}

/**
 * Forwards `request` to the same path and query on `apiUrl` and streams the response back.
 * Used by the `/api/$` server route so the browser can call `/api/*` on the
 * client's own origin in every environment, without CORS.
 *
 * Sets `x-forwarded-for`/`-host`/`-proto`, overwriting whatever the browser sent, so the
 * API (e.g. better-auth's rate limiting) sees the real client. The API trusts these
 * headers, so don't expose it publicly except through this proxy.
 *
 * If the API is unreachable, answers 502 with the API's error shape
 * (`{ error: { code, message } }`) instead of throwing.
 */
export async function forwardToApi(
  request: Request,
  apiUrl: string,
  { clientIp, fetch: fetchImpl = fetch }: ForwardOptions = {},
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname, search } = url;
  const headers = new Headers(request.headers);
  for (const name of REQUEST_HEADERS_TO_DROP) headers.delete(name);
  if (clientIp) headers.set("x-forwarded-for", clientIp);
  else headers.delete("x-forwarded-for");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.slice(0, -1));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = new Request(new URL(pathname + search, apiUrl), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
    signal: request.signal,
    // Required by Node's fetch to stream a request body.
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);

  let response: Response;
  try {
    response = await fetchImpl(upstream);
  } catch {
    return Response.json(
      { error: { code: "api_unreachable", message: "API unreachable" } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(response.headers);
  for (const name of RESPONSE_HEADERS_TO_DROP) responseHeaders.delete(name);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
