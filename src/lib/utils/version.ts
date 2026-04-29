export function isNewerVersion(current: string, latest: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);

  const cur = parse(current);
  const lat = parse(latest);
  const len = Math.max(cur.length, lat.length);

  for (let i = 0; i < len; i++) {
    const c = cur[i] ?? 0;
    const l = lat[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}
