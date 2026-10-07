import { z } from "zod";

/** Liveness: the process is up and serving requests. Never checks dependencies. */
export const Liveness = z
  .object({ status: z.literal("ok"), uptime: z.number() })
  .meta({ id: "Liveness" });
export type Liveness = z.infer<typeof Liveness>;

/** The liveness report. A failing dependency must not make an orchestrator restart the process. */
export const getLiveness = (): Liveness => ({ status: "ok", uptime: Math.round(process.uptime()) });

/** Result of one dependency check. `disabled` means the dependency isn't configured. */
export const CheckStatus = z.enum(["ok", "error", "disabled"]);

/** The readiness report: served by `GET /api/health/ready` and the MCP `health` tool. */
export const Health = z
  .object({
    /** `degraded` when any configured dependency fails its check. */
    status: z.enum(["ok", "degraded"]),
    /** Seconds since the process started. */
    uptime: z.number(),
    checks: z.object({
      database: CheckStatus,
      /** `ok` when sign-in is configured. Never makes the status `degraded`. */
      auth: z.enum(["ok", "disabled"]),
    }),
  })
  // `id` names the schema in the OpenAPI spec (`#/components/schemas/Health`).
  .meta({ id: "Health" });
export type Health = z.infer<typeof Health>;

export interface HealthDeps {
  /** Resolves if the database answers. Omit when no database is configured. */
  pingDatabase?: () => Promise<unknown>;
  /** Whether auth (sign-in) is configured. */
  authEnabled?: boolean;
  /** How long a check may take before it counts as failed. */
  timeoutMs?: number;
}

const check = async (ping: (() => Promise<unknown>) | undefined, timeoutMs: number) => {
  if (!ping) return "disabled" as const;
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      ping(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
    return "ok" as const;
  } catch {
    return "error" as const;
  } finally {
    clearTimeout(timer);
  }
};

/** Checks the process and its configured dependencies. Never throws. */
export async function getHealth({
  pingDatabase,
  authEnabled = false,
  timeoutMs = 2_000,
}: HealthDeps = {}): Promise<Health> {
  const database = await check(pingDatabase, timeoutMs);
  return {
    status: database === "error" ? "degraded" : "ok",
    uptime: Math.round(process.uptime()),
    checks: { database, auth: authEnabled ? "ok" : "disabled" },
  };
}
