export function currentOrigin(fallback: string): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return fallback.replace(/\/$/, "");
}

export function oneParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
