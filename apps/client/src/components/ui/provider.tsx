import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import type { ReactNode } from "react";

// App-specific overrides on Chakra's default theme: Inter for body text and headings
// (loaded in `routes/__root.tsx`). `defaultConfig` includes every component's
// styles, so any Chakra component works without registering anything.
const appConfig = defineConfig({
  theme: {
    tokens: {
      fonts: {
        body: { value: '"Inter", sans-serif' },
        heading: { value: '"Inter", sans-serif' },
      },
    },
  },
  globalCss: {
    html: {
      fontFamily: "body",
    },
  },
});

const system = createSystem(defaultConfig, appConfig);

/**
 * Chakra UI provider. The app is dark mode only: `className="dark"` on `<html>`
 * (see `routes/__root.tsx`) switches Chakra's semantic tokens (`bg`, `fg`, ...) to
 * their dark values. There is no color-mode toggle; don't add `next-themes`.
 */
export function Provider({ children }: { children: ReactNode }) {
  return <ChakraProvider value={system}>{children}</ChakraProvider>;
}
