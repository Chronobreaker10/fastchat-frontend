export function formatDateTime(isoString) {
  if (!isoString) {
    return "n/a";
  }

  const date = new Date(isoString);
  return date.toLocaleString();
}
