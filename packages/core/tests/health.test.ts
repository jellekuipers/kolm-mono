import { expect, test } from "vite-plus/test";
import { Health, Liveness, getHealth, getLiveness } from "../src/health.ts";

test("without a database, the database check is disabled", async () => {
  const health = await getHealth();
  expect(Health.parse(health)).toEqual(health);
  expect(health).toMatchObject({ status: "ok", checks: { database: "disabled" } });
});

test("a database that answers is ok", async () => {
  const health = await getHealth({ pingDatabase: () => Promise.resolve() });
  expect(health).toMatchObject({ status: "ok", checks: { database: "ok" } });
});

test("a failing database degrades the status", async () => {
  const health = await getHealth({ pingDatabase: () => Promise.reject(new Error("down")) });
  expect(health).toMatchObject({ status: "degraded", checks: { database: "error" } });
});

test("a database that hangs fails after the timeout", async () => {
  const health = await getHealth({ pingDatabase: () => new Promise(() => {}), timeoutMs: 10 });
  expect(health.checks.database).toBe("error");
});

test("liveness reports the process only", () => {
  const live = getLiveness();
  expect(Liveness.parse(live)).toEqual(live);
  expect(live.status).toBe("ok");
});
