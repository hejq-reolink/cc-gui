import { describe, it, expect } from "vitest";
import {
  CLI_TO_APP_MODE,
  APP_TO_CLI_MODE,
  getPermModeLabel,
} from "../chat-permissions";

describe("CLI_TO_APP_MODE", () => {
  it("maps all CLI modes to app modes", () => {
    expect(CLI_TO_APP_MODE.default).toBe("ask");
    expect(CLI_TO_APP_MODE.acceptEdits).toBe("auto_read");
    expect(CLI_TO_APP_MODE.bypassPermissions).toBe("auto_all");
    expect(CLI_TO_APP_MODE.plan).toBe("plan");
    expect(CLI_TO_APP_MODE.auto).toBe("auto");
    expect(CLI_TO_APP_MODE.dontAsk).toBe("dont_ask");
  });
});

describe("APP_TO_CLI_MODE", () => {
  it("maps all app modes to CLI modes", () => {
    expect(APP_TO_CLI_MODE.ask).toBe("default");
    expect(APP_TO_CLI_MODE.auto_read).toBe("acceptEdits");
    expect(APP_TO_CLI_MODE.auto_all).toBe("bypassPermissions");
    expect(APP_TO_CLI_MODE.plan).toBe("plan");
    expect(APP_TO_CLI_MODE.auto).toBe("auto");
    expect(APP_TO_CLI_MODE.dont_ask).toBe("dontAsk");
  });

  it("is the inverse of CLI_TO_APP_MODE", () => {
    for (const [cliName, appName] of Object.entries(CLI_TO_APP_MODE)) {
      expect(APP_TO_CLI_MODE[appName]).toBe(cliName);
    }
  });
});

describe("getPermModeLabel", () => {
  const mockT = (key: string) => `translated:${key}`;

  it("returns translated label for known modes", () => {
    expect(getPermModeLabel("default", mockT)).toBe("translated:prompt_permAskShort");
    expect(getPermModeLabel("acceptEdits", mockT)).toBe("translated:prompt_permAutoReadShort");
    expect(getPermModeLabel("bypassPermissions", mockT)).toBe("translated:prompt_permAutoAllShort");
    expect(getPermModeLabel("plan", mockT)).toBe("translated:prompt_permPlanShort");
    expect(getPermModeLabel("auto", mockT)).toBe("translated:prompt_permAutoShort");
    expect(getPermModeLabel("dontAsk", mockT)).toBe("translated:prompt_permDontAskShort");
  });

  it("falls back to raw mode string for unknown modes", () => {
    expect(getPermModeLabel("unknown_mode", mockT)).toBe("unknown_mode");
    expect(getPermModeLabel("", mockT)).toBe("");
  });
});
