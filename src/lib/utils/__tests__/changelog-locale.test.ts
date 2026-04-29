import { describe, expect, it } from "vitest";
import { isChangelogFallback } from "../changelog-locale";

describe("isChangelogFallback", () => {
  it("returns false when requested and content locales match", () => {
    expect(isChangelogFallback("en", "en")).toBe(false);
    expect(isChangelogFallback("zh-CN", "zh-CN")).toBe(false);
  });

  it("returns true when a non-English locale falls back to English", () => {
    expect(isChangelogFallback("zh-CN", "en")).toBe(true);
  });

  it("treats missing locales as English", () => {
    expect(isChangelogFallback(undefined, undefined)).toBe(false);
    expect(isChangelogFallback("", "en")).toBe(false);
  });
});
