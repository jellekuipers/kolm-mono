import { expect, test } from "vite-plus/test";
import { formatDuration } from "../src/lib/format.ts";

test("formatDuration", () => {
  expect(formatDuration(0)).toBe("0s");
  expect(formatDuration(42)).toBe("42s");
  expect(formatDuration(3_661)).toBe("1h 1m");
  expect(formatDuration(90_061)).toBe("1d 1h");
  expect(formatDuration(-1)).toBe("—");
});
