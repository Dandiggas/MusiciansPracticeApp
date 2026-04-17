/**
 * @jest-environment jsdom
 */
import { MetronomeEngine } from "./metronome-engine";

// Minimal Web Audio mock — enough surface for MetronomeEngine.
// Each node tracks what it's connected to so routing can be asserted.

const makeParam = () => ({
  value: 0,
  exponentialRampToValueAtTime: jest.fn(),
  linearRampToValueAtTime: jest.fn(),
});

const makeOscillator = () => ({
  frequency: makeParam(),
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
});

const makeGain = () => ({
  gain: makeParam(),
  connect: jest.fn(),
  disconnect: jest.fn(),
});

type MockOscillator = ReturnType<typeof makeOscillator>;
type MockGain = ReturnType<typeof makeGain>;

let createdOscillators: MockOscillator[];
let createdGains: MockGain[];
let mockContext: {
  currentTime: number;
  destination: { __tag: "destination" };
  createOscillator: jest.Mock;
  createGain: jest.Mock;
  close: jest.Mock;
};

const installAudioContextMock = () => {
  createdOscillators = [];
  createdGains = [];
  mockContext = {
    currentTime: 0,
    destination: { __tag: "destination" },
    createOscillator: jest.fn(() => {
      const o = makeOscillator();
      createdOscillators.push(o);
      return o;
    }),
    createGain: jest.fn(() => {
      const g = makeGain();
      createdGains.push(g);
      return g;
    }),
    close: jest.fn(),
  };
  (global as unknown as { AudioContext: unknown }).AudioContext = jest.fn(
    () => mockContext,
  );
};

describe("MetronomeEngine — master gain routing", () => {
  beforeEach(() => {
    installAudioContextMock();
  });

  it("creates a masterGain node FIRST on start() (before any per-click envelope) and connects it to destination exactly once", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();

    // start() schedules at least one click synchronously (BPM 120, SCHEDULE_AHEAD_TIME 0.1s),
    // so createdGains must contain masterGain + >=1 envelope gain.
    expect(createdGains.length).toBeGreaterThanOrEqual(2);

    const masterGain = createdGains[0];
    expect(masterGain).toBeDefined();
    expect(masterGain.connect).toHaveBeenCalledWith(mockContext.destination);
    // masterGain routes to destination exactly once — guards against a regression
    // where the scheduler reverts to direct-to-destination per click.
    expect(masterGain.connect).toHaveBeenCalledTimes(1);
  });

  it("routes per-click envelope gains into masterGain, not directly to destination", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();

    const masterGain = createdGains[0];
    // schedule() fires at least one click synchronously; the second gain node
    // onward is a per-click envelope
    const envelopeGain = createdGains[1];
    expect(envelopeGain).toBeDefined();
    expect(envelopeGain.connect).toHaveBeenCalledWith(masterGain);
    expect(envelopeGain.connect).not.toHaveBeenCalledWith(
      mockContext.destination,
    );
  });

  it("disconnects masterGain and closes the audio context on stop()", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();
    const masterGain = createdGains[0];
    engine.stop();
    expect(masterGain.disconnect).toHaveBeenCalled();
    expect(mockContext.close).toHaveBeenCalled();
  });

  it("creates a fresh masterGain on the next start() after a stop()", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();
    const firstMasterGain = createdGains[0];
    engine.stop();

    // Reinstall the mock so createdGains starts empty for the second start()
    installAudioContextMock();
    engine.start();
    const secondMasterGain = createdGains[0];

    expect(secondMasterGain).toBeDefined();
    expect(secondMasterGain).not.toBe(firstMasterGain);
  });
});
