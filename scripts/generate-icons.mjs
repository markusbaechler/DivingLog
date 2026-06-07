// Erzeugt einfache PNG-App-Icons (ozeanblau mit hellem Tropfen-Akzent).
// Reine Node-Standardbibliothek (zlib), keine Abhängigkeiten.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  // Hintergrundfarbe (ocean-700) und Akzent (ocean-200)
  const bg = [20, 99, 225];
  const fg = [188, 228, 255];
  const cx = size / 2;
  const cy = size * 0.52;
  const r = size * 0.28;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  let pos = 0;
  for (let y = 0; y < size; y++) {
    raw[pos++] = 0; // Filter: none
    for (let x = 0; x < size; x++) {
      // Tropfenform: Kreis + Spitze nach oben
      const dx = x - cx;
      const dy = y - cy;
      const inCircle = dx * dx + dy * dy <= r * r;
      const inTip =
        y < cy && Math.abs(dx) <= ((cy - y) / (cy - (cy - r * 1.6))) * r * 0.9;
      const isFg = inCircle || inTip;
      const c = isFg ? fg : bg;
      raw[pos++] = c[0];
      raw[pos++] = c[1];
      raw[pos++] = c[2];
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), makePng(size));
  console.log(`icon-${size}.png erstellt`);
}
