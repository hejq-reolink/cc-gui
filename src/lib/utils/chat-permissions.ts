/**
 * Permission mode mapping between CLI names and app/UI names.
 *
 * Store/dropdown use CLI names; UserSettings uses app names;
 * adapter.rs maps app → CLI.
 */

export const CLI_TO_APP_MODE: Record<string, string> = {
  default: "ask",
  acceptEdits: "auto_read",
  bypassPermissions: "auto_all",
  plan: "plan",
  auto: "auto",
  dontAsk: "dont_ask",
};

export const APP_TO_CLI_MODE: Record<string, string> = {
  ask: "default",
  auto_read: "acceptEdits",
  auto_all: "bypassPermissions",
  plan: "plan",
  auto: "auto",
  dont_ask: "dontAsk",
};

export function getPermModeLabel(
  mode: string,
  t: (key: string) => string,
): string {
  const map: Record<string, () => string> = {
    default: () => t("prompt_permAskShort"),
    acceptEdits: () => t("prompt_permAutoReadShort"),
    bypassPermissions: () => t("prompt_permAutoAllShort"),
    plan: () => t("prompt_permPlanShort"),
    auto: () => t("prompt_permAutoShort"),
    dontAsk: () => t("prompt_permDontAskShort"),
  };
  return map[mode]?.() ?? mode;
}
