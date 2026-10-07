import type { Db } from "db";
import { expect, test, vi } from "vite-plus/test";
import { createApp, type AppDeps } from "../src/app.ts";

const rpc = (body: unknown, headers: Record<string, string> = {}, deps: AppDeps = {}) =>
  createApp(deps).request("/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
      ...headers,
    },
    body: JSON.stringify(body),
  });

test("initialize", async () => {
  const res = await rpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    },
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { result: { serverInfo: { name: string } } };
  expect(body.result.serverInfo.name).toBe("kolm-mono");
});

test("the health tool returns the health report", async () => {
  const res = await rpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "health", arguments: {} },
  });
  const body = (await res.json()) as { result: { structuredContent: unknown } };
  expect(body.result.structuredContent).toMatchObject({
    status: "ok",
    checks: { database: "disabled" },
  });
});

test("browser requests from unknown origins are rejected", async () => {
  const res = await rpc(
    { jsonrpc: "2.0", id: 3, method: "tools/list" },
    { origin: "https://evil.example" },
  );
  expect(res.status).toBe(403);
});

test("preflight from an allowed origin gets CORS headers", async () => {
  const origin = "http://localhost:6274";
  const res = await createApp({ mcpAllowedOrigins: [origin] }).request("/mcp", {
    method: "OPTIONS",
    headers: { origin, "access-control-request-method": "POST" },
  });
  expect(res.status).toBeLessThan(300);
  expect(res.headers.get("access-control-allow-origin")).toBe(origin);
});

const callListNotes = (args: unknown, deps?: AppDeps) =>
  rpc(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "list_notes", arguments: args },
    },
    {},
    deps,
  );

test("list_notes is read-only and takes query and limit", async () => {
  const res = await rpc({ jsonrpc: "2.0", id: 5, method: "tools/list" });
  const body = (await res.json()) as {
    result: {
      tools: { name: string; annotations: unknown; inputSchema: { properties: object } }[];
    };
  };
  const tool = body.result.tools.find((t) => t.name === "list_notes");
  expect(tool?.annotations).toMatchObject({ readOnlyHint: true });
  expect(Object.keys(tool?.inputSchema.properties ?? {})).toEqual(["query", "limit"]);
});

test("the list_notes tool returns notes from the database", async () => {
  const row = { id: "n1", title: "Hello", body: "First note", createdAt: new Date("2026-01-01") };
  const findMany = vi.fn(() => Promise.resolve([row]));
  const db = { note: { findMany } } as unknown as Db;
  const res = await callListNotes({ query: "hello", limit: 3 }, { db });
  const body = (await res.json()) as { result: { structuredContent: unknown; content: unknown[] } };
  expect(body.result.structuredContent).toEqual({
    notes: [{ ...row, createdAt: "2026-01-01T00:00:00.000Z" }],
  });
  expect(body.result.content).toHaveLength(1);
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
});

test("the list_notes tool reports a missing database as a tool error", async () => {
  const res = await callListNotes({});
  const body = (await res.json()) as { result: { isError: boolean } };
  expect(body.result.isError).toBe(true);
});

test("the list_notes tool rejects an invalid limit", async () => {
  const res = await callListNotes({ limit: 500 });
  const body = (await res.json()) as { result?: { isError: boolean }; error?: unknown };
  expect(body.result?.isError ?? Boolean(body.error)).toBe(true);
});
