/** Formats a duration in seconds as its two largest units (`3d 4h`, `5m 6s`, `7s`). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const units: [string, number][] = [
    ["d", 86_400],
    ["h", 3_600],
    ["m", 60],
    ["s", 1],
  ];
  let rest = Math.floor(seconds);
  const parts: string[] = [];
  for (const [unit, size] of units) {
    const count = Math.floor(rest / size);
    rest -= count * size;
    if (count > 0 || parts.length > 0) parts.push(`${count}${unit}`);
  }
  return parts.slice(0, 2).join(" ") || "0s";
}
