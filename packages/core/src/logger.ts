const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;

export type LogLevel = keyof typeof LEVELS;
export type LogFormat = "json" | "pretty";
export type LogFields = Record<string, unknown>;

/** A structured logger. Messages are short constants; context goes in `fields`. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** A logger that adds `fields` to every line (e.g. `requestId`). */
  child(fields: LogFields): Logger;
}

export interface LoggerOptions {
  level?: LogLevel;
  format?: LogFormat;
  fields?: LogFields;
  /** Where lines go. Defaults to stdout (debug/info) and stderr (warn/error). */
  write?: (level: Exclude<LogLevel, "silent">, line: string) => void;
}

const defaultWrite: NonNullable<LoggerOptions["write"]> = (level, line) => {
  (level === "warn" || level === "error" ? process.stderr : process.stdout).write(`${line}\n`);
};

// Errors don't serialize to JSON on their own: keep their name, message and stack.
const serialize = (value: unknown): unknown =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

const formatPretty = (level: string, message: string, fields: LogFields) => {
  const time = new Date().toISOString().slice(11, 23);
  const context = Object.entries(fields)
    .map(([key, value]) => {
      const v = serialize(value);
      return `${key}=${typeof v === "string" ? v : JSON.stringify(v)}`;
    })
    .join(" ");
  return `${time} ${level.toUpperCase().padEnd(5)} ${message}${context ? ` ${context}` : ""}`;
};

/** Creates a logger. Most code should use the shared `logger` (or a `child` of it). */
export function createLogger(options: LoggerOptions = {}): Logger {
  const { level = "info", format = "pretty", fields = {}, write = defaultWrite } = options;
  const min = LEVELS[level];
  const log =
    (lineLevel: Exclude<LogLevel, "silent">) =>
    (message: string, extra: LogFields = {}) => {
      if (LEVELS[lineLevel] < min) return;
      const all = { ...fields, ...extra };
      const line =
        format === "json"
          ? JSON.stringify(
              { time: new Date().toISOString(), level: lineLevel, message, ...all },
              (_, value: unknown) => serialize(value),
            )
          : formatPretty(lineLevel, message, all);
      write(lineLevel, line);
    };
  return {
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
    child: (more) => createLogger({ ...options, fields: { ...fields, ...more } }),
  };
}

const parseLevel = (value: string | undefined): LogLevel =>
  value && value.toLowerCase() in LEVELS ? (value.toLowerCase() as LogLevel) : "info";

/**
 * The shared logger, configured from the environment:
 * - `LOG_LEVEL`: `debug`, `info` (default), `warn`, `error` or `silent`.
 * - `LOG_FORMAT`: `json` (one object per line) or `pretty`. Anything else is `pretty`.
 */
export const logger = createLogger({
  level: parseLevel(process.env.LOG_LEVEL),
  format: process.env.LOG_FORMAT === "json" ? "json" : "pretty",
});
