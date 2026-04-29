import type { FileEntry, GitFileStat, GitSummary } from "$lib/types";

export interface ReviewableFile {
  path: string;
  status: string;
  insertions: number;
  deletions: number;
  action?: FileEntry["action"];
  toolUseId?: string;
}

export function mergeFilesForReview(
  fileEntries: FileEntry[],
  gitFiles: GitFileStat[],
): ReviewableFile[] {
  const map = new Map<string, ReviewableFile>();

  for (const gf of gitFiles) {
    map.set(gf.path, {
      path: gf.path,
      status: gf.status,
      insertions: gf.insertions,
      deletions: gf.deletions,
    });
  }

  for (const fe of fileEntries) {
    const existing = map.get(fe.path);
    if (existing) {
      existing.action = fe.action;
      existing.toolUseId = fe.toolUseId;
    } else {
      map.set(fe.path, {
        path: fe.path,
        status: fe.action === "write" ? "A" : fe.action === "edit" ? "M" : "?",
        insertions: 0,
        deletions: 0,
        action: fe.action,
        toolUseId: fe.toolUseId,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function statusColor(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "A":
      return { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", label: "A" };
    case "M":
      return { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", label: "M" };
    case "D":
      return { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", label: "D" };
    case "R":
      return { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", label: "R" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", label: status || "?" };
  }
}

export function fileSummaryText(summary: GitSummary | null): string {
  if (!summary) return "";
  const parts: string[] = [];
  parts.push(`${summary.total_files} file${summary.total_files !== 1 ? "s" : ""}`);
  if (summary.total_insertions > 0) parts.push(`+${summary.total_insertions}`);
  if (summary.total_deletions > 0) parts.push(`-${summary.total_deletions}`);
  return parts.join(" ");
}
