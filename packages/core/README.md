# core

Business logic shared by the HTTP API and the MCP server: both call the same
functions, so a feature written here is available to both. Plain TypeScript and Zod.
There is no barrel: import modules by subpath (`core/health`, `core/notes`, `core/logger`).
Keep Node APIs out of modules the client imports (`notes.ts`).

- `health.ts`: `getHealth` and the `Health` schema.
- `notes.ts`: `listNotes` and its schemas, the worked example (see AGENTS.md).
- `logger.ts`: the structured `logger` (`LOG_LEVEL`, `LOG_FORMAT`).
