import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Health, getHealth } from "core/health";
import { ListNotesInput, NoteList, listNotes } from "core/notes";
import { NOTES_DISABLED, healthDeps, notesDeps, type AppDeps } from "./deps.ts";

/**
 * The MCP server: every tool is a thin wrapper around a `core` function, the same
 * one the HTTP API calls. Register new tools here; they get the app's services in `deps`.
 */
export function createMcpServer(deps: AppDeps) {
  const server = new McpServer({ name: "kolm-mono", version: "0.0.0" });

  server.registerTool(
    "health",
    {
      title: "Health",
      description: "Reports whether the API and its configured dependencies (database) are ready.",
      outputSchema: Health.shape,
      annotations: { readOnlyHint: true },
    },
    async () => {
      const health = await getHealth(healthDeps(deps));
      return {
        content: [{ type: "text", text: JSON.stringify(health) }],
        structuredContent: health,
      };
    },
  );

  // The first tool with input. Tool arguments are untrusted, like an HTTP request: the SDK
  // validates them against `inputSchema` before the handler runs. `/mcp` is unauthenticated,
  // so this tool is read-only and the data is public demo data.
  server.registerTool(
    "list_notes",
    {
      title: "List notes",
      description: "Lists notes, newest first. Optionally filters by text in the title or body.",
      inputSchema: ListNotesInput.shape,
      outputSchema: NoteList.shape,
      annotations: { readOnlyHint: true },
    },
    async (input) => {
      const notes = notesDeps(deps);
      if (!notes) return { isError: true, content: [{ type: "text", text: NOTES_DISABLED }] };
      const result = await listNotes(notes, input);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
      };
    },
  );

  return server;
}

/**
 * Handles one MCP request (Streamable HTTP, stateless, JSON responses). Stateless
 * transports can't be reused, so each request gets a fresh server and transport.
 */
export async function handleMcpRequest(request: Request, deps: AppDeps) {
  const server = createMcpServer(deps);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}
