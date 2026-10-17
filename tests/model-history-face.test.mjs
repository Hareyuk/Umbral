import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projection, investorReturn, displayValues, revenuePerSubscriber, ASSUMPTIONS } from '../assets/js/model.js';
import { addEvent, summarize, eventsToCSV, visibleEvents } from '../assets/js/history.js';
import { watchSVG, normalizeFace, defaultFace, wrap, FACE_STYLES } from '../assets/js/watchface.js';

test('modelo: ingreso promedio por suscriptor con precio de US$ 25 por mes', () => {
  // 60% elige el anual (US$ 240) y 40% el mensual (12 x US$ 25 = US$ 300).
  assert.equal(revenuePerSubscriber(), 0.6 * 240 + 0.4 * 300);
  assert.ok(revenuePerSubscriber({ ...ASSUMPTIONS, annualShare: 1 }) < revenuePerSubscriber({ ...ASSUMPTIONS, annualShare: 0 }), 'el anual es más barato');
});

test('modelo: proyección a 5 años, con pérdidas al principio y crecimiento después', () => {
  const p = projection();
  assert.equal(p.length, 5);
  assert.deepEqual(p.map((y) => y.revenue), [40050, 120150, 293700, 694200, 1335000]);
  assert.deepEqual(p.map((y) => y.result), [-55890, -17670, 90140, 361240, 817000]);
  assert.deepEqual(p.map((y) => y.cumulative), [-55890, -73560, 16580, 377820, 1194820]);
  // Cada año hay más suscriptores que el anterior, y en el año 5 siguen siendo menos del 2% del total.
  p.slice(1).forEach((y, i) => assert.ok(y.subscribers > p[i].subscribers));
  assert.ok(p[4].penetration < 0.02);
  // Costos = fijos + 15% de comisión sobre suscripciones.
  for (const y of p) assert.equal(y.costs, y.fixedCosts + Math.round(y.plusRevenue * 0.15));
});

test('modelo: retorno para quien invierte US$ 100.000 por el 20%', () => {
  const r = investorReturn();
  assert.equal(r.neededCash, 73560, 'la inversión cubre la peor caja acumulada');
  assert.ok(ASSUMPTIONS.investmentUsd >= r.neededCash);
  assert.equal(r.breakEvenYear, 3);
  assert.equal(r.paybackYear, 3);
  assert.equal(r.postMoney, 500000);
  assert.equal(r.valuation, 1335000 * 3);
  assert.equal(r.stake, 801000);
  assert.ok(Math.abs(r.multiple - 8.01) < 1e-9);
  assert.ok(Math.abs(r.annualReturn - (8.01 ** (1 / 5) - 1)) < 1e-12);
  // Escenario prudente: valuación de 1 vez los ingresos.
  const prudente = investorReturn({ ...ASSUMPTIONS, revenueMultiple: 1 });
  assert.ok(Math.abs(prudente.multiple - 2.67) < 1e-9);
});

test('displayValues: precios de la landing (Plus US$ 25/mes o US$ 240/año, combo con 6 meses)', () => {
  assert.deepEqual(displayValues(), {
    plusMonthly: 'US$ 25',
    plusAnnual: 'US$ 240',
    plusAnnualPerMonth: 'US$ 20',
    annualSavings: '20%',
    comboFreeMonths: '6',
  });
  assert.equal(displayValues({ ...ASSUMPTIONS, plusMonthlyUsd: 4, plusAnnualUsd: 36 }).annualSavings, '25%');
});

test('historial: el plan Básico ve solo los últimos 7 días; Plus ve todo', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const now = 100 * DAY;
  const evs = [0, 1, 6.9, 7, 30].map((d) => ({ at: now - d * DAY, metric: 'noise', level: 'alert' }));
  assert.equal(visibleEvents(evs, { now }).length, 3);
  assert.equal(visibleEvents(evs, { now, plus: true }).length, 5);
});

test('esfera: la correa tiene relieve en ambos lados', () => {
  const svg = watchSVG({ face: defaultFace() });
  const ridges = svg.match(/<rect x="62" y="(-?\d+)" width="116"/g) ?? [];
  assert.ok(ridges.length >= 12, `nervaduras: ${ridges.length}`);
  assert.ok(ridges.some((r) => r.includes('y="-')) && ridges.some((r) => / y="2\d\d"/.test(r)));
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
