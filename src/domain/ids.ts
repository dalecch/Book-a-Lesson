import type { IdFactory } from "./types";

export function sequenceIds(scope = "id"): IdFactory {
  let next = 0;
  return (prefix: string) => {
    next += 1;
    return `${scope}-${prefix}-${next}`;
  };
}

export function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
