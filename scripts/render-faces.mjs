// Pre-renderiza las esferas de la landing dentro de index.html (entre <!-- face:x --> y <!-- /face:x -->).
// Así el sitio se ve completo sin JavaScript. Uso: npm run build:faces
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { watchSVG } from '../assets/js/watchface.js';

export const FACES = {
  hero: {
    readings: { noise: 64, light: 700, heart: 84, spo2: 98 },
    levels: { noise: 'pre' },
    face: { primary: 'noise', complications: ['heart', 'light', 'spo2'], style: 'vivo' },
  },
  g1: {
    readings: { noise: 58, light: 420, heart: 76, spo2: 98 },
    face: { primary: 'noise', complications: ['heart', 'light', 'spo2'], style: 'vivo' },
  },
  g2: {
    readings: { noise: 66, light: 900, heart: 104, spo2: 97 },
    levels: { heart: 'pre', noise: 'pre' },
    face: { primary: 'heart', complications: ['noise', 'spo2'], style: 'contraste' },
  },
  g3: {
    readings: { noise: 52, light: 2600, heart: 80, spo2: 98 },
    levels: { light: 'alert' },
    face: { primary: 'noise', complications: ['light', 'heart', 'spo2'], style: 'suave', numbers: false },
  },
  g4: {
    readings: { noise: 86, light: 600, heart: 98, spo2: 97 },
    face: { primary: 'noise', style: 'oscuro' },
    alert: { metric: 'noise', level: 'alert', title: 'Hay mucho ruido' },
  },
};

export function renderInto(html) {
  let out = html;
  for (const [key, cfg] of Object.entries(FACES)) {
    const re = new RegExp(`(<!-- face:${key} -->)[\\s\\S]*?(<!-- /face:${key} -->)`);
    if (!re.test(out)) throw new Error(`Falta el marcador face:${key} en index.html`);
    out = out.replace(re, (_, a, b) => `${a}${watchSVG(cfg)}${b}`);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = fileURLToPath(new URL('../index.html', import.meta.url));
  writeFileSync(file, renderInto(readFileSync(file, 'utf8')));
  console.log('Esferas renderizadas en index.html');
}
