import { defineConfig } from "vite-plus";

// The server runs directly on Node (type stripping), so this config only holds tasks
// and test settings. Long-running tasks are never cached.
export default defineConfig({
  run: {
    tasks: {
      dev: { command: "node --watch src/index.ts", cache: false },
      start: { command: "node src/index.ts", cache: false },
    },
  },
  // Keep test output clean; tests assert on responses, not log lines.
  test: { env: { LOG_LEVEL: "silent" } },
});
