const fs = require('fs');

function writeWav(filename, samples, sampleRate=44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample/8;
  const blockAlign = numChannels * bitsPerSample/8;
  const dataSize = samples.length * 2; // 16-bit
  const buffer = Buffer.alloc(44 + dataSize);

  let o = 0;
  buffer.write('RIFF', o); o += 4;
  buffer.writeUInt32LE(36 + dataSize, o); o += 4;
  buffer.write('WAVE', o); o += 4;
  buffer.write('fmt ', o); o += 4;
  buffer.writeUInt32LE(16, o); o += 4;            // PCM fmt chunk size
  buffer.writeUInt16LE(1, o); o += 2;             // PCM
  buffer.writeUInt16LE(numChannels, o); o += 2;
  buffer.writeUInt32LE(sampleRate, o); o += 4;
  buffer.writeUInt32LE(byteRate, o); o += 4;
  buffer.writeUInt16LE(blockAlign, o); o += 2;
  buffer.writeUInt16LE(bitsPerSample, o); o += 2;
  buffer.write('data', o); o += 4;
  buffer.writeUInt32LE(dataSize, o); o += 4;

  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE((s * 0x7FFF) | 0, 44 + i*2);
  }
  fs.writeFileSync(filename, buffer);
}

function envIndex(i, n) {
  // short attack/release to avoid clicks
  const t = i / (n - 1);
  const a = Math.min(1, t / 0.05);
  const r = Math.min(1, (1 - t) / 0.05);
  return Math.min(a, r);
}

function tone(freq, durSec, sr=44100, vol=0.35) {
  const n = Math.max(1, Math.round(sr * durSec));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = envIndex(i, n);
    out[i] = vol * env * Math.sin(2 * Math.PI * freq * (i / sr));
  }
  return out;
}

function concat(a, b) {
  const out = new Float32Array(a.length + b.length);
  out.set(a, 0); out.set(b, a.length);
  return out;
}

// Build cues:
// inhale: rising two-tone (G4->C5)
let inhale = concat(tone(392.0, 0.18), tone(523.25, 0.22));

// hold: steady A4
let hold = tone(440.0, 0.28);

// exhale: falling two-tone (C5->G4)
let exhale = concat(tone(523.25, 0.18), tone(392.0, 0.22));

try {
  writeWav('assets/audio/inhale.wav', inhale);
  writeWav('assets/audio/hold.wav',   hold);
  writeWav('assets/audio/exhale.wav', exhale);
  console.log('✓ Wrote assets/audio/{inhale,hold,exhale}.wav');
} catch (e) {
  console.error('Failed to write WAV files:', e.message);
  process.exit(1);
}
