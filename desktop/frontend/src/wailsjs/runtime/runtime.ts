// Wails runtime JS bindings stub — replaced at build time by real Wails runtime.
// This file allows the TypeScript compiler and test runner to resolve the module.

export function EventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).runtime) {
    return (window as unknown as Record<string, { EventsOn: typeof EventsOn }>).runtime.EventsOn(
      eventName,
      callback,
    );
  }
  return () => {};
}

export function EventsOff(...eventNames: string[]): void {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).runtime) {
    (window as unknown as Record<string, { EventsOff: typeof EventsOff }>).runtime.EventsOff(
      ...eventNames,
    );
  }
}

export function EventsOnce(eventName: string, callback: (...data: unknown[]) => void): void {
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).runtime) {
    (window as unknown as Record<string, { EventsOnce: typeof EventsOnce }>).runtime.EventsOnce(
      eventName,
      callback,
    );
  }
}
