export function parseProcessInput(
  input: string,
): { id: string; source: "url" | "id" } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const idPattern = /^[A-Z]{2,3}\.(?:REQ|NTC|AD|PR)\.\d+$/i;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromParam =
        url.searchParams.get("noticeUID") ??
        url.searchParams.get("id_del_proceso") ??
        url.searchParams.get("id");
      if (fromParam && idPattern.test(fromParam)) {
        return { id: fromParam.toUpperCase(), source: "url" };
      }
      const segment = url.pathname.split("/").filter(Boolean).pop() ?? "";
      if (idPattern.test(segment)) {
        return { id: segment.toUpperCase(), source: "url" };
      }
      return null;
    } catch {
      return null;
    }
  }

  const cleaned = trimmed.replace(/\s+/g, "");
  if (idPattern.test(cleaned)) {
    return { id: cleaned.toUpperCase(), source: "id" };
  }
  return null;
}

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
