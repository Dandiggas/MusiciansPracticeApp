export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFreq: number = 60,
  maxFreq: number = 1500
): number | null {
  const bufferLength = buffer.length;

  let rms = 0;
  for (let i = 0; i < bufferLength; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferLength);
  if (rms < 0.01) return null;

  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorrelation = -1;
  let bestPeriod = -1;

  for (let period = minPeriod; period <= maxPeriod && period < bufferLength; period++) {
    let correlation = 0;
    for (let i = 0; i < bufferLength - period; i++) {
      correlation += buffer[i] * buffer[i + period];
    }
    correlation /= (bufferLength - period);

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod === -1 || bestCorrelation < 0.01) return null;

  const prev = autocorrelationAt(buffer, bestPeriod - 1);
  const curr = autocorrelationAt(buffer, bestPeriod);
  const next = autocorrelationAt(buffer, bestPeriod + 1);

  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  // A legitimate parabolic correction should only nudge the period by a
  // fraction of a sample. On a weak/noisy signal this can blow up into a
  // huge or negative value, which would push refinedPeriod to zero or
  // negative and produce a negative/invalid frequency below. Reject it and
  // fall back to the whole-number period estimate instead.
  const refinedPeriod = isFinite(shift) && Math.abs(shift) < 1 ? bestPeriod + shift : bestPeriod;

  if (refinedPeriod <= 0) return null;

  return sampleRate / refinedPeriod;
}

function autocorrelationAt(buffer: Float32Array, period: number): number {
  let sum = 0;
  for (let i = 0; i < buffer.length - period; i++) {
    sum += buffer[i] * buffer[i + period];
  }
  return sum / (buffer.length - period);
}
