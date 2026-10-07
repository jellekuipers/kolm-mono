import { expect, test } from "vite-plus/test";
import { safeRedirect } from "../src/lib/redirect.ts";

test("keeps same-site paths", () => {
  expect(safeRedirect("/profile?tab=1")).toBe("/profile?tab=1");
});

test("rejects other sites and missing targets", () => {
  for (const target of [
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
  ]) {
    expect(safeRedirect(target)).toBe("/profile");
  }
});
