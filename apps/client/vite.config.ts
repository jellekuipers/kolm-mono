import babel from "@rolldown/plugin-babel";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  // Long-running tasks are never cached.
  run: {
    tasks: {
      dev: { command: "vp dev --port 3001", cache: false },
      preview: { command: "vp preview --port 3001", cache: false },
    },
  },
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    // Loads and validates .env.schema. `auto-load`: the built server resolves its env at
    // startup (from its cwd), instead of baking values into the bundle.
    varlockVitePlugin({ ssrInjectMode: "auto-load" }),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ]),
});
