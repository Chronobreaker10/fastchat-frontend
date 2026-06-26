export function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) {
    return "н/д";
  }

  const date = new Date(isoString);
  return date.toLocaleString("ru-RU");
}
