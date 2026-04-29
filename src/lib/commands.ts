export type CommandCategory = "chat" | "tools" | "navigation" | "settings" | "diagnostics";
export type CommandAgent = "claude" | "codex" | "both";
export type CommandAction =
  | "send_prompt"
  | "navigate"
  | "ipc_command"
  | "toggle_state"
  | "open_modal";

export interface CommandDef {
  id: string;
  name: string;
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  category: CommandCategory;
  agent: CommandAgent;
  shortcut?: string;
  action: CommandAction;
  payload?: string;
}

export const commands: CommandDef[] = [
  // Chat
  {
    id: "switch-model",
    name: "Switch Model",
    nameKey: "cmd_switchModel",
    description: "Change the AI model for the next message",
    descriptionKey: "cmd_switchModelDesc",
    category: "chat",
    agent: "both",
    action: "open_modal",
    payload: "model-selector",
  },
  {
    id: "compact",
    name: "Compact Conversation",
    nameKey: "cmd_compact",
    description: "Compress the conversation to free up context",
    descriptionKey: "cmd_compactDesc",
    category: "chat",
    agent: "claude",
    action: "send_prompt",
    payload: "/compact",
  },
  {
    id: "toggle-plan",
    name: "Toggle Plan Mode",
    nameKey: "cmd_togglePlan",
    description: "Switch between plan mode (read-only) and normal mode",
    descriptionKey: "cmd_togglePlanDesc",
    category: "chat",
    agent: "claude",
    action: "toggle_state",
    payload: "plan_mode",
  },
  {
    id: "review",
    name: "Review Changes",
    nameKey: "cmd_reviewChanges",
    description: "Ask the agent to review recent code changes",
    descriptionKey: "cmd_reviewChangesDesc",
    category: "chat",
    agent: "claude",
    action: "send_prompt",
    payload:
      "Review my recent changes. Look at the git diff and provide feedback on code quality, potential bugs, and improvements.",
  },
  {
    id: "export-chat",
    name: "Export Chat (Markdown)",
    nameKey: "cmd_exportMd",
    description: "Export the conversation as a Markdown file",
    descriptionKey: "cmd_exportMdDesc",
    category: "chat",
    agent: "both",
    shortcut: "Cmd+Shift+E",
    action: "ipc_command",
    payload: "export_conversation",
  },
  {
    id: "export-chat-html",
    name: "Export Chat as HTML",
    nameKey: "cmd_exportHtml",
    description: "Export the conversation as a self-contained HTML file with full visual fidelity",
    descriptionKey: "cmd_exportHtmlDesc",
    category: "chat",
    agent: "both",
    shortcut: "Cmd+Shift+H",
    action: "ipc_command",
    payload: "export_conversation_html",
  },
  {
    id: "new-claude",
    name: "New Claude Chat",
    nameKey: "cmd_newClaude",
    description: "Start a new Claude Code conversation",
    descriptionKey: "cmd_newClaudeDesc",
    category: "chat",
    agent: "both",
    action: "navigate",
    payload: "/chat?agent=claude",
  },
  // Codex disabled
  // {
  //   id: "new-codex",
  //   name: "New Codex Chat",
  //   description: "Start a new Codex conversation",
  //   category: "chat",
  //   agent: "both",
  //   action: "navigate",
  //   payload: "/chat?agent=codex",
  // },
  {
    id: "stop-run",
    name: "Stop Run",
    nameKey: "cmd_stopRun",
    description: "Stop the currently running agent process",
    descriptionKey: "cmd_stopRunDesc",
    category: "chat",
    agent: "both",
    action: "ipc_command",
    payload: "stop_run",
  },

  // Tools
  {
    id: "git-diff",
    name: "Git Diff",
    nameKey: "cmd_gitDiffName",
    description: "View current git changes",
    descriptionKey: "cmd_gitDiffDesc",
    category: "tools",
    agent: "both",
    shortcut: "Cmd+Shift+D",
    action: "ipc_command",
    payload: "get_git_diff",
  },
  {
    id: "git-status",
    name: "Git Status",
    nameKey: "cmd_gitStatusName",
    description: "View git status summary",
    descriptionKey: "cmd_gitStatusDesc",
    category: "tools",
    agent: "both",
    action: "ipc_command",
    payload: "get_git_status",
  },
  {
    id: "token-cost",
    name: "Token Cost",
    nameKey: "cmd_tokenCost",
    description: "View token usage and cost for current run",
    descriptionKey: "cmd_tokenCostDesc",
    category: "tools",
    agent: "both",
    action: "ipc_command",
    payload: "get_run_artifacts",
  },

  // Navigation
  {
    id: "go-chat",
    name: "Go to Chat",
    nameKey: "cmd_goChat",
    description: "Navigate to the chat page",
    descriptionKey: "cmd_goChatDesc",
    category: "navigation",
    agent: "both",
    action: "navigate",
    payload: "/chat",
  },
  {
    id: "go-settings",
    name: "Go to Settings",
    nameKey: "cmd_goSettings",
    description: "Navigate to settings",
    descriptionKey: "cmd_goSettingsDesc",
    category: "navigation",
    agent: "both",
    action: "navigate",
    payload: "/settings",
  },
  {
    id: "go-memory",
    name: "Go to Memory",
    nameKey: "cmd_goMemory",
    description: "Navigate to the memory editor",
    descriptionKey: "cmd_goMemoryDesc",
    category: "navigation",
    agent: "both",
    action: "navigate",
    payload: "/memory",
  },
  {
    id: "go-usage",
    name: "Go to Usage",
    nameKey: "cmd_goUsage",
    description: "Navigate to usage statistics",
    descriptionKey: "cmd_goUsageDesc",
    category: "navigation",
    agent: "both",
    action: "navigate",
    payload: "/usage",
  },
  // Codex disabled
  // {
  //   id: "go-codex-config",
  //   name: "Go to Codex Config",
  //   description: "Navigate to Codex agent configuration",
  //   category: "navigation",
  //   agent: "both",
  //   action: "navigate",
  //   payload: "/config/codex",
  // },
  {
    id: "go-plugins",
    name: "Go to Plugins",
    nameKey: "cmd_goPlugins",
    description: "Browse plugins and skills",
    descriptionKey: "cmd_goPluginsDesc",
    category: "navigation",
    agent: "both",
    action: "navigate",
    payload: "/plugins",
  },

  // Settings
  {
    id: "set-model",
    name: "Set Default Model",
    nameKey: "cmd_setModel",
    description: "Change the default model for the agent",
    descriptionKey: "cmd_setModelDesc",
    category: "settings",
    agent: "both",
    action: "open_modal",
    payload: "model-selector",
  },
  {
    id: "set-cwd",
    name: "Set Working Directory",
    nameKey: "cmd_setCwd",
    description: "Change the project working directory",
    descriptionKey: "cmd_setCwdDesc",
    category: "settings",
    agent: "both",
    action: "open_modal",
    payload: "folder-browser",
  },
  {
    id: "configure-tools",
    name: "Configure Tools",
    nameKey: "cmd_configureTools",
    description: "Set allowed tools for the agent",
    descriptionKey: "cmd_configureToolsDesc",
    category: "settings",
    agent: "both",
    action: "navigate",
    payload: "/settings",
  },
  {
    id: "permissions",
    name: "Permissions",
    nameKey: "cmd_permissions",
    description: "Manage tool permission rules (allow/deny)",
    descriptionKey: "cmd_permissionsDesc",
    category: "settings",
    agent: "both",
    action: "open_modal",
    payload: "permissions",
  },

  // Diagnostics
  {
    id: "doctor",
    name: "Run Doctor",
    nameKey: "cmd_runDoctor",
    description: "Check if agent CLIs are installed and working",
    descriptionKey: "cmd_runDoctorDesc",
    category: "diagnostics",
    agent: "both",
    action: "ipc_command",
    payload: "check_agent_cli",
  },
  {
    id: "version",
    name: "Version Info",
    nameKey: "cmd_versionInfoName",
    description: "Show OpenCovibe Desktop version information",
    descriptionKey: "cmd_versionInfoDesc",
    category: "diagnostics",
    agent: "both",
    action: "open_modal",
    payload: "version-info",
  },
];

export function filterCommands(query: string, agent?: string, translateFn?: (key: string) => string): CommandDef[] {
  const q = query.toLowerCase();
  return commands.filter((cmd) => {
    if (agent && cmd.agent !== "both" && cmd.agent !== agent) return false;
    if (!q) return true;
    const name = (translateFn && cmd.nameKey ? translateFn(cmd.nameKey) : cmd.name).toLowerCase();
    const desc = (translateFn && cmd.descriptionKey ? translateFn(cmd.descriptionKey) : cmd.description).toLowerCase();
    return (
      name.includes(q) ||
      desc.includes(q) ||
      cmd.name.toLowerCase().includes(q) ||
      cmd.id.includes(q)
    );
  });
}

export function groupByCategory(cmds: CommandDef[]): Record<CommandCategory, CommandDef[]> {
  const groups: Record<CommandCategory, CommandDef[]> = {
    chat: [],
    tools: [],
    navigation: [],
    settings: [],
    diagnostics: [],
  };
  for (const cmd of cmds) {
    groups[cmd.category].push(cmd);
  }
  return groups;
}

export const categoryLabels: Record<CommandCategory, string> = {
  chat: "Chat",
  tools: "Tools",
  navigation: "Navigation",
  settings: "Settings",
  diagnostics: "Diagnostics",
};

export const categoryLabelKeys: Record<CommandCategory, string> = {
  chat: "cmd_catChat",
  tools: "cmd_catTools",
  navigation: "cmd_catNavigation",
  settings: "cmd_catSettings",
  diagnostics: "cmd_catDiagnostics",
};
