# e2e

Playwright smoke tests against the full stack. `vp run e2e` starts `vp run dev` (or
reuses one that's already running) and runs `tests/` in Chromium. Run
`vp run e2e:install` once first to download the browser.

The tests run with the default env (no database, auth off), as in CI.
