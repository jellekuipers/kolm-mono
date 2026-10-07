import { expect, test } from "vite-plus/test";
import { createLogger } from "../src/logger.ts";

const capture = (options: Parameters<typeof createLogger>[0] = {}) => {
  const lines: string[] = [];
  const logger = createLogger({ ...options, write: (_, line) => lines.push(line) });
  return { logger, lines };
};

test("json lines carry level, message and fields", () => {
  const { logger, lines } = capture({ format: "json" });
  logger.child({ requestId: "r1" }).info("request", { status: 200 });
  expect(JSON.parse(lines[0]!)).toMatchObject({
    level: "info",
    message: "request",
    requestId: "r1",
    status: 200,
  });
});

test("lines below the level are dropped", () => {
  const { logger, lines } = capture({ level: "warn" });
  logger.info("hidden");
  logger.warn("shown");
  expect(lines).toHaveLength(1);
  expect(lines[0]).toContain("WARN  shown");
});

test("errors keep their message and stack", () => {
  const { logger, lines } = capture({ format: "json" });
  logger.error("boom", { err: new Error("bad") });
  const { err } = JSON.parse(lines[0]!) as { err: { message: string; stack: string } };
  expect(err.message).toBe("bad");
  expect(err.stack).toContain("Error: bad");
});
