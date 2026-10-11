// Original offline completion bell: no downloaded sample or audio service.
const fs = require('node:fs'), path = require('node:path');
const rate = 32000, length = rate * 1.15, data = Buffer.alloc(Math.floor(length) * 2);
for (let i = 0; i < data.length / 2; i++) {
  const t = i / rate; let sample = 0;
  for (const [delay, frequency] of [[0, 523.25], [.12, 659.25], [.24, 783.99]]) {
    const age = t - delay;
    if (age >= 0) sample += .12 * Math.min(1, age / .009) * Math.exp(-age * 5.5) * (Math.sin(2 * Math.PI * frequency * age) + .16 * Math.sin(2 * Math.PI * frequency * 2 * age));
  }
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), i * 2);
}
const header = Buffer.alloc(44); header.write('RIFF'); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
fs.writeFileSync(path.resolve(__dirname, '../desktop/completion.wav'), Buffer.concat([header, data]));
