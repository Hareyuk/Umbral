import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PICTOS, PICTO_IDS, MAX_WATCH_PICTOS, normalizePictos, defaultPictos } from '../assets/js/pictos.js';
import { watchSVG, defaultFace, normalizeFace, FACE_STYLES, pictoCells } from '../assets/js/watchface.js';
import { buildWeeklyReportPDF, reportLines } from '../assets/js/report.js';

test('pictogramas: cada uno tiene texto en primera persona, etiqueta corta y dibujo', () => {
  for (const id of PICTO_IDS) {
    const p = PICTOS[id];
    assert.ok(p.label && p.short && p.paths.length, id);
    // Celda angosta: 56 px y letra de 9 px (aprox. 5,3 px por carácter en negrita).
    assert.ok(p.short.length * 5.3 <= 50, `${id}: "${p.short}" no entra en la celda angosta`);
  }
});

test('pictogramas: máximo 5 en el reloj, sin repetir ni inventar', () => {
  assert.equal(MAX_WATCH_PICTOS, 5);
  const p = normalizePictos({ items: ['si', 'si', 'no', 'luna', 'agua', 'casa', 'bano', 'comer'], shortcut: 'comer' });
  assert.deepEqual(p.items, ['si', 'no', 'agua', 'casa', 'bano']);
  assert.equal(p.shortcut, 'si', 'el acceso directo tiene que estar entre los elegidos');
  assert.equal(normalizePictos({ items: ['si', 'no'], shortcut: 'no' }).shortcut, 'no');
  assert.deepEqual(normalizePictos(null), defaultPictos());
  assert.deepEqual(normalizePictos({ items: [] }), { items: [], shortcut: null });
});

test('reloj: pantalla cuadrada (caja y pantalla son rectángulos redondeados)', () => {
  const svg = watchSVG({ readings: { noise: 60 }, face: defaultFace() });
  assert.match(svg, /<rect x="12" y="12" width="216" height="216" rx="44"/);
  assert.match(svg, /<rect x="24" y="24" width="192" height="192" rx="30"/);
  assert.ok(!svg.includes('r="113"') && !svg.includes('r="104"'), 'sin caja ni pantalla circular');
});

test('reloj: grilla de pictogramas marca el acceso directo', () => {
  const svg = watchSVG({ face: defaultFace(), pictos: { items: ['pausa', 'ayuda', 'si', 'no'], shortcut: 'ayuda' } });
  assert.match(svg, /aria-label="Reloj Umbral\. Mis pictogramas: Necesito una pausa, Necesito ayuda, Sí, No\."/);
  assert.equal((svg.match(/width="84" height="84"/g) ?? []).length, 4);
  assert.equal((svg.match(/stroke="#49DE96" stroke-width="3"\/>/g) ?? []).length, 1);
});

test('reloj: grilla de 5 pictogramas (3 arriba, 2 abajo) sin salirse de la pantalla', () => {
  const svg = watchSVG({ face: defaultFace(), pictos: { items: ['pausa', 'ayuda', 'si', 'no', 'auriculares'], shortcut: 'no' } });
  assert.equal((svg.match(/width="56" height="84"/g) ?? []).length, 3);
  assert.equal((svg.match(/width="87" height="84"/g) ?? []).length, 2);
  for (const [x, y, w] of pictoCells(5)) {
    assert.ok(x >= 24 && x + w <= 216 && y >= 24 && y + 84 <= 216, `celda ${x},${y}`);
  }
  const cells = pictoCells(5);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const [a, b] = [cells[i], cells[j]];
      const overlap = a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + 84 && b[1] < a[1] + 84;
      assert.ok(!overlap, `celdas ${i} y ${j} se pisan`);
    }
  }
});

test('reloj redondo: caja y pantalla circulares, contenido dentro del círculo', () => {
  const svg = watchSVG({ readings: { noise: 60, heart: 80, light: 300, spo2: 98 }, face: { ...defaultFace(), shape: 'redondo' } });
  assert.match(svg, /<circle cx="120" cy="120" r="112"/);
  assert.match(svg, /<circle cx="120" cy="120" r="98" fill=/);
  assert.ok(!svg.includes('width="216" height="216"'), 'sin caja cuadrada');
  // Los valores de los datos chicos (y=204) tienen que entrar en el círculo de radio 98.
  for (const m of svg.matchAll(/<text x="(\d+)" y="204"/g)) {
    const halfWidth = Math.sqrt(98 ** 2 - (204 - 120) ** 2);
    assert.ok(Math.abs(Number(m[1]) - 120) + 12 <= halfWidth, `dato chico en x=${m[1]} se sale del borde`);
  }
  assert.equal(normalizeFace({ shape: 'triangular' }).shape, 'cuadrado');
});

test('reloj redondo: pictogramas dentro del círculo (4 y 5)', () => {
  for (const n of [4, 5]) {
    for (const [x, y, w, h] of pictoCells(n, 'redondo')) {
      for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        const d = Math.hypot(px - 120, py - 120);
        assert.ok(d <= 98, `${n} pictos: esquina (${px}, ${py}) a ${d.toFixed(1)} del centro`);
      }
    }
  }
  const svg = watchSVG({ face: { ...defaultFace(), shape: 'redondo' }, pictos: { items: ['pausa', 'ayuda', 'si', 'no', 'agua'], shortcut: 'si' } });
  assert.equal((svg.match(/width="50" height="50"/g) ?? []).length, 5);
});

test('reloj: pictograma en grande para mostrar', () => {
  const svg = watchSVG({ face: defaultFace(), pictos: { show: 'tocar' } });
  assert.match(svg, /Pictograma: No me toques/);
  assert.ok(svg.includes('>No me toques<'));
});

test('contraste: etiquetas de pictogramas sobre su fondo en todas las pantallas', async () => {
  const { contrast } = await import('./helpers/contrast.mjs');
  for (const [name, s] of Object.entries(FACE_STYLES)) {
    assert.ok(contrast(s.muted, s.tile) >= 4.5, `${name}: muted sobre tile`);
    assert.ok(contrast(s.text, s.tile) >= 4.5, `${name}: text sobre tile`);
  }
});

// ---------- Informe PDF ----------
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 16, 15, 0);
const EVENTS = [
  { at: NOW - 1 * 3600e3, metric: 'noise', level: 'alert', value: 88, place: 'Recital' },
  { at: NOW - 2 * 3600e3, metric: 'noise', level: 'pre', value: 70, place: 'Colectivo' },
  { at: NOW - 2 * DAY, metric: 'light', level: 'alert', value: 2600, place: 'Supermercado' },
  { at: NOW - 3 * DAY, metric: 'noise', level: 'alert', value: 91, place: 'Recital' },
  { at: NOW - 10 * DAY, metric: 'heart', level: 'alert', value: 120, place: 'Viejo' },
];

test('informe: resume solo la última semana', () => {
  const lines = reportLines(EVENTS, { now: NOW, name: 'Axel' }).map((l) => l[2]);
  assert.equal(lines[0], 'Umbral · Informe semanal');
  assert.ok(lines.includes('Ruido: 2 avisos y 1 pre-aviso'), 'singular y plural correctos');
  assert.ok(lines.includes('Luz: 1 aviso y 0 pre-avisos'));
  assert.ok(lines.includes('Pulso: 0 avisos y 0 pre-avisos'), 'el evento de hace 10 días no entra');
  assert.ok(lines.includes('Recital: 2'));
  assert.ok(lines.some((l) => l.startsWith('Axel · Del ')));
  assert.ok(!lines.some((l) => l.includes('Viejo')));
});

test('informe: PDF válido (cabecera, xref con offsets reales, fin de archivo)', () => {
  const pdf = buildWeeklyReportPDF(EVENTS, { now: NOW });
  const bin = Buffer.from(pdf).toString('latin1');
  assert.ok(bin.startsWith('%PDF-1.4'));
  assert.ok(bin.trimEnd().endsWith('%%EOF'));
  const startxref = Number(bin.match(/startxref\n(\d+)/)[1]);
  assert.ok(bin.slice(startxref).startsWith('xref'));
  const offsets = [...bin.slice(startxref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  assert.equal(offsets.length, 6);
  offsets.forEach((o, i) => assert.ok(bin.slice(o).startsWith(`${i + 1} 0 obj`), `objeto ${i + 1}`));
  const len = Number(bin.match(/\/Length (\d+)/)[1]);
  const start = bin.indexOf('stream\n') + 7;
  assert.equal(bin.slice(start + len, start + len + 10), '\nendstream');
});

test('informe: tildes y ñ en WinAnsi, paréntesis escapados', () => {
  const pdf = Buffer.from(buildWeeklyReportPDF([{ at: NOW, metric: 'noise', level: 'alert', value: 80, place: 'Baño (escuela)' }], { now: NOW })).toString('latin1');
  assert.ok(pdf.includes('Últimos avisos'), 'Ú como un solo byte');
  assert.ok(pdf.includes('Baño \\(escuela\\)'));
  assert.ok(pdf.includes('/Encoding /WinAnsiEncoding'));
});

test('informe: sin avisos igual genera un PDF', () => {
  const lines = reportLines([], { now: NOW }).map((l) => l[2]);
  assert.ok(lines.includes('Todavía no hay avisos registrados.'));
  assert.ok(buildWeeklyReportPDF([], { now: NOW }).length > 500);
});
