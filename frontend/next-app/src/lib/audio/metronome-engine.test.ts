/**
 * @jest-environment jsdom
 */
import { MetronomeEngine } from "./metronome-engine";

// Minimal Web Audio mock — enough surface for MetronomeEngine.
// Each node tracks what it's connected to so routing can be asserted.

const makeParam = () => ({
  value: 0,
  setValueAtTime: jest.fn(),
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

describe("MetronomeEngine — setVolume", () => {
  beforeEach(() => {
    installAudioContextMock();
  });

  it("applies a square-law curve on start(): masterGain initial value = volume²", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.setVolume(0.5);
    engine.start();
    const masterGain = createdGains[0];
    expect(masterGain.gain.value).toBeCloseTo(0.25, 10);
  });

  it("clamps setVolume input to [0, 1]", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.setVolume(2);
    engine.start();
    expect(createdGains[0].gain.value).toBeCloseTo(1, 10);

    installAudioContextMock();
    const engine2 = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine2.setVolume(-1);
    engine2.start();
    expect(createdGains[0].gain.value).toBeCloseTo(0, 10);
  });

  it("coerces non-finite values (NaN, Infinity, -Infinity) to 0", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.setVolume(NaN);
    engine.start();
    expect(createdGains[0].gain.value).toBe(0);

    installAudioContextMock();
    const engine2 = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine2.setVolume(Infinity);
    engine2.start();
    expect(createdGains[0].gain.value).toBe(0);

    installAudioContextMock();
    const engine3 = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine3.setVolume(-Infinity);
    engine3.start();
    expect(createdGains[0].gain.value).toBe(0);
  });

  it("anchors the ramp with setValueAtTime(currentValue, now) before linearRampToValueAtTime(~15 ms) when running", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();
    const masterGain = createdGains[0];
    const startValue = masterGain.gain.value; // should be the default 0.8² = 0.64
    mockContext.currentTime = 1.0;

    engine.setVolume(0.6);

    // Anchor comes first: setValueAtTime with the current gain value at `now`.
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledTimes(1);
    const [anchorValue, anchorTime] = (
      masterGain.gain.setValueAtTime as jest.Mock
    ).mock.calls[0];
    expect(anchorValue).toBeCloseTo(startValue, 10);
    expect(anchorTime).toBeCloseTo(1.0, 4);

    // Then the ramp to v² at now + 15 ms.
    expect(masterGain.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(1);
    const [target, atTime] = (
      masterGain.gain.linearRampToValueAtTime as jest.Mock
    ).mock.calls[0];
    expect(target).toBeCloseTo(0.36, 10); // 0.6²
    expect(atTime).toBeCloseTo(1.015, 4); // currentTime + MASTER_RAMP_TIME (0.015)
  });

  it("does NOT ramp or anchor when not running; only caches the value for next start()", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.setVolume(0.3);
    // No start() yet — no masterGain exists
    engine.start();
    const masterGain = createdGains[0];
    expect(masterGain.gain.setValueAtTime).not.toHaveBeenCalled();
    expect(masterGain.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
    expect(masterGain.gain.value).toBeCloseTo(0.09, 10); // 0.3²
  });
});

describe("MetronomeEngine — per-click base gains (accent / unaccented ratio)", () => {
  beforeEach(() => {
    installAudioContextMock();
  });

  it("accented click uses base gain 1.0", () => {
    const engine = new MetronomeEngine({ bpm: 120, beatsPerMeasure: 4 });
    engine.start();
    // createdGains[0] = masterGain, [1] = first per-click envelope.
    // currentBeat starts at 0 → isAccent true on first click.
    const firstClickEnvelope = createdGains[1];
    expect(firstClickEnvelope.gain.value).toBeCloseTo(1.0, 10);
  });

  it("unaccented click uses base gain 0.75 (retuned from 0.5)", () => {
    // At BPM 1200 the click interval is 0.05 s. The engine's SCHEDULE_AHEAD_TIME
    // is 0.1 s, so the while-loop inside schedule() queues two clicks on the
    // first call: beat 0 (accented) and beat 1 (unaccented).
    // createdGains[0] = masterGain, [1] = accent envelope, [2] = unaccent envelope.
    const engine = new MetronomeEngine({ bpm: 1200, beatsPerMeasure: 2 });
    engine.start();
    // Preflight: if SCHEDULE_AHEAD_TIME ever drops below the 0.05 s interval,
    // only one click will schedule and createdGains[2] would be undefined.
    // Fail loudly in that case rather than silently passing / crashing.
    expect(createdGains.length).toBeGreaterThanOrEqual(3);
    expect(createdGains[2].gain.value).toBeCloseTo(0.75, 10);
  });
});
