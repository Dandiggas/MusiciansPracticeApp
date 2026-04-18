/**
 * @jest-environment jsdom
 */
import {
  getMetronomeVolume,
  saveMetronomeVolume,
} from "./practice-session-store";

// jest.setup.ts replaces global.localStorage with jest.fn() stubs that don't
// actually store. Install a Map-backed replacement so round-trip tests work.
const installRealLocalStorage = () => {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: mock,
    configurable: true,
    writable: true,
  });
  return store;
};

describe("metronome volume persistence", () => {
  beforeEach(() => {
    installRealLocalStorage();
  });

  it("round-trips a value saved and then read", () => {
    saveMetronomeVolume(0.6);
    expect(getMetronomeVolume()).toBeCloseTo(0.6, 10);
  });

  it("returns null when nothing has been saved", () => {
    expect(getMetronomeVolume()).toBeNull();
  });

  it("clamps on save: values > 1 store as 1", () => {
    saveMetronomeVolume(2);
    expect(getMetronomeVolume()).toBe(1);
  });

  it("clamps on save: negative values store as 0", () => {
    saveMetronomeVolume(-0.5);
    expect(getMetronomeVolume()).toBe(0);
  });

  it("clamps on read: hand-edited out-of-range values are clamped", () => {
    window.localStorage.setItem(
      "practice:metronome-volume",
      JSON.stringify({ volume: 5, updatedAt: "x" }),
    );
    expect(getMetronomeVolume()).toBe(1);
  });

  it("returns null when stored JSON is corrupt", () => {
    window.localStorage.setItem("practice:metronome-volume", "{ not json");
    expect(getMetronomeVolume()).toBeNull();
  });

  it("returns null when stored object is missing the volume field", () => {
    window.localStorage.setItem(
      "practice:metronome-volume",
      JSON.stringify({ updatedAt: "x" }),
    );
    expect(getMetronomeVolume()).toBeNull();
  });
});
