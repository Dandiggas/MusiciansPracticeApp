const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// How long (in ms) the tuner keeps showing the last detected note after pitch
// detection drops out for a frame or two (e.g. between attacks, brief dips
// below the RMS threshold). Without this hold, the display flickers to "--"
// and back on every missed frame, making it hard to actually read the note.
export const NOTE_HOLD_MS = 400;

export interface NoteInfo {
  name: string;
  octave: number;
  frequency: number;
  cents: number;
}

export function frequencyToNote(frequency: number, referenceFreq: number = 440): NoteInfo {
  const semitones = 12 * Math.log2(frequency / referenceFreq);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);

  const midiNote = 69 + roundedSemitones;
  const name = NOTE_NAMES[((midiNote % 12) + 12) % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  const exactFrequency = referenceFreq * Math.pow(2, roundedSemitones / 12);

  return { name, octave, frequency: exactFrequency, cents };
}

export function noteToFrequency(name: string, octave: number, referenceFreq: number = 440): number {
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) throw new Error(`Unknown note: ${name}`);
  const midiNote = (octave + 1) * 12 + noteIndex;
  const semitonesFromA4 = midiNote - 69;
  return referenceFreq * Math.pow(2, semitonesFromA4 / 12);
}
