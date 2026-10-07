import { defineConfig } from "vite-plus";

// Playwright, not Vitest: these tasks drive a real browser against `vp run dev`, so
// they're kept out of `vp run ready` and never cached.
export default defineConfig({
  run: {
    tasks: {
      e2e: { command: "playwright test", cache: false },
      // Downloads Chromium (once per machine; pass --with-deps in CI).
      install: { command: "playwright install chromium", cache: false },
    },
  },
});
