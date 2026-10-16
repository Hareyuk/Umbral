// Genera los íconos PNG de la PWA sin dependencias (encoder PNG propio con zlib).
// Uso: npm run build:icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BLUE = [61, 127, 192];
const NAVY = [28, 54, 90];
const SUN = [73, 222, 150];
const ORANGE = [14, 145, 123];

function inRoundedSquare(u, v, radius) {
  const dx = Math.max(radius - u, 0, u - (1 - radius));
  const dy = Math.max(radius - v, 0, v - (1 - radius));
  return dx * dx + dy * dy <= radius * radius;
}

// Color de un punto (u, v en 0..1). Anillo azul oscuro, arco amarillo y centro naranja.
function sample(u, v, full) {
  if (!full && !inRoundedSquare(u, v, 0.22)) return null;
  const k = full ? 0.78 : 1; // zona segura para íconos "maskable"
  const dx = (u - 0.5) / k;
  const dy = (v - 0.5) / k;
  const r = Math.hypot(dx, dy);
  if (r < 0.085) return ORANGE;
  if (r > 0.24 && r < 0.335) {
    const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    return (ang - 120 + 360) % 360 <= 230 ? SUN : NAVY;
  }
  return BLUE;
}

function render(size, full) {
  const px = new Uint8Array(size * size * 4);
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, full);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const i = (y * size + x) * 4;
      if (a) {
        px[i] = Math.round(r / a);
        px[i + 1] = Math.round(g / a);
        px[i + 2] = Math.round(b / a);
        px[i + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
  }
  return encodePNG(size, size, px);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = fileURLToPath(new URL('../assets/icons/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}icon-192.png`, render(192, false));
  writeFileSync(`${dir}icon-512.png`, render(512, false));
  writeFileSync(`${dir}maskable-512.png`, render(512, true));
  writeFileSync(`${dir}apple-touch-icon.png`, render(180, true));
  console.log('Íconos generados en assets/icons/');
}
