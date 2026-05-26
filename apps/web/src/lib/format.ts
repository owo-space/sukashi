export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 2)} ${units[unit]}`;
}

export function formatCny(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "0.00";
  return (Number(amount) / 100).toFixed(2);
}

export function formatUnixDate(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const d = new Date(seconds * 1000);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export function formatUnixDay(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}
