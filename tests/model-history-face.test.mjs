import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marketModel, displayValues, ASSUMPTIONS } from '../assets/js/model.js';
import { addEvent, summarize, eventsToCSV } from '../assets/js/history.js';
import { watchSVG, normalizeFace, defaultFace, wrap, FACE_STYLES } from '../assets/js/watchface.js';

test('modelo de negocio: aritmética del escenario', () => {
  const m = marketModel();
  assert.equal(m.autisticAR, 362557);
  assert.equal(m.autisticCABA, 24580);
  assert.equal(m.year1.plusRevenue, 54000);
  assert.equal(m.year1.schoolRevenue, 10000);
  assert.equal(m.year1.total, 64000);
  assert.equal(m.year3.total, 432000 + 120000 + 100000);
  assert.ok(Math.abs(m.year3.penetration - 12000 / 362557) < 1e-12);
});

test('modelo de negocio: responde a cambios de supuestos', () => {
  const m = marketModel({ ...ASSUMPTIONS, plusPriceUsdMonth: 5 });
  assert.equal(m.year1.plusRevenue, 1500 * 5 * 12);
});

test('displayValues: formato que muestra la landing', () => {
  const d = displayValues();
  assert.equal(d['year1.total'], 'US$ 64.000');
  assert.equal(d['year3.total'], 'US$ 652.000');
  assert.equal(d['year3.penetration'], '3,3%');
});

test('historial: más nuevo primero, con tope', () => {
  let list = [];
  for (let i = 0; i < 205; i++) list = addEvent(list, { at: i, metric: 'noise', level: 'alert', value: 80, place: 'Aula' });
  assert.equal(list.length, 200);
  assert.equal(list[0].at, 204);
});

test('historial: resumen por métrica y nivel', () => {
  const s = summarize([
    { metric: 'noise', level: 'alert' },
    { metric: 'noise', level: 'pre' },
    { metric: 'noise', level: 'alert' },
    { metric: 'zzz', level: 'alert' },
  ]);
  assert.deepEqual(s.noise, { pre: 1, alert: 2 });
  assert.deepEqual(s.light, { pre: 0, alert: 0 });
});

test('historial: CSV con encabezado y escape de comas y comillas', () => {
  const csv = eventsToCSV([{ at: 0, metric: 'noise', level: 'alert', value: 88.5, place: 'Recital, "VIP"' }]);
  const [head, row] = csv.split('\n');
  assert.equal(head, 'fecha_hora_utc,medida,nivel,valor,unidad,lugar');
  assert.equal(row, '1970-01-01T00:00:00.000Z,Ruido,aviso,88.5,dB,"Recital, ""VIP"""');
});

test('esfera: normalizeFace corrige entradas inválidas', () => {
  assert.deepEqual(normalizeFace(null), defaultFace());
  const f = normalizeFace({ primary: 'heart', complications: ['heart', 'noise', 'noise', 'x', 'light', 'spo2'], style: 'neón' });
  assert.equal(f.primary, 'heart');
  assert.deepEqual(f.complications, ['noise', 'light', 'spo2']);
  assert.equal(f.style, defaultFace().style);
});

test('esfera: SVG accesible con descripción de valores y umbral', () => {
  const svg = watchSVG({ readings: { noise: 64, heart: 80, light: 300, spo2: 98 }, levels: { noise: 'pre' }, face: defaultFace(), thresholds: { noise: 70 } });
  assert.match(svg, /^<svg [^>]*role="img"/);
  assert.match(svg, /aria-label="Reloj Umbral\. Ruido 64 dB, subiendo\./);
  assert.match(svg, /Tu umbral de ruido: 70 dB/);
  assert.ok(!svg.includes('NaN') && !svg.includes('undefined'));
});

test('esfera: modo solo colores no muestra números', () => {
  const svg = watchSVG({ readings: { noise: 64 }, face: { ...defaultFace(), numbers: false } });
  assert.ok(svg.includes('>Tranquilo<'));
  assert.ok(!/>64</.test(svg));
});

test('esfera: aviso muestra el título y funciona sin lecturas', () => {
  for (const style of Object.keys(FACE_STYLES)) {
    const svg = watchSVG({ face: { ...defaultFace(), style }, alert: { metric: 'noise', level: 'alert', title: 'Hay mucho ruido' } });
    assert.ok(svg.includes('>Hay mucho<') && svg.includes('>ruido<'), style);
    assert.ok(!svg.includes('NaN'));
  }
});

test('wrap: corta sin partir palabras', () => {
  assert.deepEqual(wrap('Mi corazón late rápido', 13), ['Mi corazón', 'late rápido']);
});
