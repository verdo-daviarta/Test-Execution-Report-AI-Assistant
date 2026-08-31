export function createId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}`;
}
