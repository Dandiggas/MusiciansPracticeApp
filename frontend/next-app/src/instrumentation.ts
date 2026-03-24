// Node v22+ ships an experimental localStorage that breaks next-themes during SSR.
// Replace it with a no-op stub before any modules load.
export async function register() {
  if (typeof window === "undefined" && typeof globalThis.localStorage !== "undefined") {
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
  }
}
