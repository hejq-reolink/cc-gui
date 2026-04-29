import type { ElementSelection } from "$lib/types";

export function isLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(u.hostname) &&
      ["http:", "https:"].includes(u.protocol)
    );
  } catch {
    return false;
  }
}

export function formatElementContext(sel: ElementSelection): string {
  const lines = [
    `[Page Element]`,
    `URL: ${sel.url}`,
    `Path: ${sel.domPath}`,
    `Tag: ${sel.tagName}`,
  ];
  if (sel.textContent) lines.push(`Text: "${sel.textContent.slice(0, 200)}"`);
  const attrs = Object.entries(sel.attributes)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}="${v}"`)
    .join(", ");
  if (attrs) lines.push(`Attributes: ${attrs}`);
  const styles = Object.entries(sel.styleSummary)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  if (styles) lines.push(`Styles: ${styles}`);
  lines.push(`HTML: ${sel.outerHtmlSnippet.slice(0, 500)}`);
  return lines.join("\n");
}
