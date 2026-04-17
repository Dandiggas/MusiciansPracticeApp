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

  it("creates a masterGain node on start() and connects it to destination", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();

    // First gain created by start() is the master gain
    const masterGain = createdGains[0];
    expect(masterGain).toBeDefined();
    expect(masterGain.connect).toHaveBeenCalledWith(mockContext.destination);
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

  it("closes the audio context on stop()", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();
    engine.stop();
    expect(mockContext.close).toHaveBeenCalled();
  });
});
