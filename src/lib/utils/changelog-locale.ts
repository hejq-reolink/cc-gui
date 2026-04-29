function normalizeChangelogLocale(locale?: string | null): string {
  const value = locale?.trim().toLowerCase();
  if (value === "zh" || value === "zh-cn" || value === "zh-hans") return "zh-CN";
  return "en";
}

export function isChangelogFallback(
  requestedLocale?: string | null,
  contentLocale?: string | null,
): boolean {
  return normalizeChangelogLocale(requestedLocale) !== normalizeChangelogLocale(contentLocale);
}
