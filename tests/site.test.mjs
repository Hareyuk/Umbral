// Chequeos estáticos del sitio: accesibilidad, contraste, PWA y consistencia de datos.
// Cubre los errores más comunes del informe WebAIM Million: contraste, imágenes sin alt y formularios sin etiqueta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { displayValues } from '../assets/js/model.js';
import { renderInto } from '../scripts/render-faces.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const PAGES = ['index.html', 'app/index.html'];
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];
const urlToFile = (u) => (u.endsWith('/') ? `${u}index.html` : u).slice(1);

for (const page of PAGES) {
  const html = read(page);

  test(`${page}: idioma, título, viewport con zoom permitido`, () => {
    assert.match(html, /<html lang="es/);
    assert.match(html, /<title>[^<]{5,}<\/title>/);
    const vp = tags(html, 'meta').find((t) => attr(t, 'name') === 'viewport');
    assert.ok(vp, 'falta meta viewport');
    assert.ok(!/user-scalable=no|maximum-scale=1(\D|$)/.test(attr(vp, 'content')), 'no bloquear el zoom');
  });

  test(`${page}: un solo h1 y enlace para saltar al contenido`, () => {
    assert.equal(tags(html, 'h1').length, 1);
    assert.match(html, /href="#main"/);
    assert.match(html, /id="main"/);
  });

  test(`${page}: imágenes con alt y sin tabindex positivo`, () => {
    for (const img of tags(html, 'img')) assert.ok(attr(img, 'alt') !== undefined, img);
    assert.ok(!/tabindex="[1-9]/.test(html));
  });

  test(`${page}: todo control de formulario tiene etiqueta`, () => {
    const ids = new Set([...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
    // Controles envueltos en <label>...</label>
    const wrapped = new Set();
    for (const m of html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)) for (const t of tags(m[1], 'input')) wrapped.add(t);
    for (const t of [...tags(html, 'input'), ...tags(html, 'select'), ...tags(html, 'textarea')]) {
      if (attr(t, 'type') === 'hidden') continue;
      const ok = wrapped.has(t) || ids.has(attr(t, 'id')) || attr(t, 'aria-label') || attr(t, 'aria-labelledby');
      assert.ok(ok, `control sin etiqueta: ${t}`);
    }
  });

  test(`${page}: botones y enlaces con nombre accesible`, () => {
    for (const m of html.matchAll(/<(button|a)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const text = m[3].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim();
      assert.ok(text || /aria-label="[^"]+"/.test(m[2]), `sin nombre: <${m[1]}${m[2]}>`);
    }
  });

  test(`${page}: todos los recursos locales existen`, () => {
    for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
      assert.ok(existsSync(join(ROOT, urlToFile(m[1]))), `no existe ${m[1]}`);
    }
  });

  test(`${page}: los tabs apuntan a paneles existentes`, () => {
    for (const t of tags(html, 'button').filter((b) => attr(b, 'role') === 'tab')) {
      assert.ok(html.includes(`id="${attr(t, 'aria-controls')}"`));
    }
  });
}

test('landing: las cifras del modelo de negocio coinciden con model.js', () => {
  const html = read('index.html');
  const shown = Object.fromEntries([...html.matchAll(/data-model="([^"]+)"[^>]*>([^<]+)</g)].map((m) => [m[1], m[2]]));
  const expected = displayValues();
  assert.deepEqual(Object.keys(shown).sort(), Object.keys(expected).sort());
  for (const [k, v] of Object.entries(expected)) assert.equal(shown[k], v, k);
});

test('landing: las esferas pre-renderizadas están al día (npm run build:faces)', () => {
  const html = read('index.html');
  assert.equal(renderInto(html), html);
});

test('app: cada control data-cfg apunta a una clave real de la config', async () => {
  const { defaultConfig } = await import('../assets/js/engine.js');
  const cfg = defaultConfig();
  for (const m of read('app/index.html').matchAll(/data-cfg="([^"]+)"/g)) {
    const v = m[1].split('.').reduce((o, k) => o?.[k], cfg);
    assert.notEqual(v, undefined, m[1]);
  }
});

// ---------- PWA ----------
function pngSize(file) {
  const b = readFileSync(join(ROOT, file));
  assert.equal(b.toString('hex', 0, 8), '89504e470d0a1a0a', `${file} no es PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('manifest: instalable (nombre, inicio, standalone, íconos 192 y 512)', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(m.name && m.short_name && m.start_url && m.scope);
  assert.equal(m.display, 'standalone');
  const pngs = m.icons.filter((i) => i.type === 'image/png');
  for (const size of ['192x192', '512x512']) assert.ok(pngs.some((i) => i.sizes === size && !i.purpose), size);
  assert.ok(pngs.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) {
    assert.ok(existsSync(join(ROOT, urlToFile(i.src))), i.src);
    if (i.type === 'image/png') assert.deepEqual(pngSize(urlToFile(i.src)).join('x'), i.sizes);
  }
  assert.ok(existsSync(join(ROOT, urlToFile(m.start_url))));
});

test('service worker: precachea archivos existentes y todo el JS del sitio', () => {
  const sw = read('sw.js');
  const list = JSON.parse(sw.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  for (const u of list) assert.ok(existsSync(join(ROOT, urlToFile(u))), u);
  for (const f of readdirSync(join(ROOT, 'assets/js'))) assert.ok(list.includes(`/assets/js/${f}`), `falta precachear ${f}`);
  assert.ok(list.includes('/assets/css/styles.css'));
  assert.match(sw, /const VERSION = 'umbral-v\d+'/);
});

// ---------- Contraste WCAG ----------
function tokens(css, marker) {
  const block = css.split(`/* tokens:${marker} */`)[1].match(/\{([\s\S]*?)\}/)[1];
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
}
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const TEXT_PAIRS = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'], ['text-muted', 'bg'], ['text-muted', 'surface'],
  ['primary', 'bg'], ['primary', 'surface'], ['on-primary', 'primary'], ['on-primary', 'primary-strong'],
  ['on-sun', 'sun'], ['on-navy', 'navy'], ['orange-text', 'bg'], ['ok', 'ok-bg'], ['pre', 'pre-bg'], ['alert', 'alert-bg'],
  ['navy', 'orange'],
];
const UI_PAIRS = [['border-strong', 'bg'], ['border-strong', 'surface'], ['focus', 'bg']];

test('contraste: nunca se usa un color sin chequear', () => {
  assert.equal(contrast('#000000', '#FFFFFF').toFixed(0), '21');
});

for (const theme of ['light', 'dark']) {
  test(`contraste ${theme}: texto 4.5:1 y bordes de controles 3:1 (WCAG AA)`, () => {
    const t = tokens(read('src/styles.css'), theme);
    for (const [fg, bg] of TEXT_PAIRS) {
      assert.ok(t[fg] && t[bg], `falta token ${fg} o ${bg}`);
      const c = contrast(t[fg], t[bg]);
      assert.ok(c >= 4.5, `${theme}: ${fg} sobre ${bg} = ${c.toFixed(2)}`);
    }
    for (const [fg, bg] of UI_PAIRS) {
      const c = contrast(t[fg], t[bg]);
      assert.ok(c >= 3, `${theme}: ${fg} sobre ${bg} = ${c.toFixed(2)}`);
    }
  });
}

test('contraste: colores de las esferas del reloj sobre su fondo', async () => {
  const { FACE_STYLES } = await import('../assets/js/watchface.js');
  for (const [name, s] of Object.entries(FACE_STYLES)) {
    for (const k of ['text', 'muted', 'ok', 'pre', 'alert']) {
      const c = contrast(s[k], s.face);
      assert.ok(c >= 4.5, `${name}.${k} = ${c.toFixed(2)}`);
    }
  }
});
