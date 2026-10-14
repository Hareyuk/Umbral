import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  METRICS, METRIC_IDS, defaultConfig, normalizeConfig, classify, createState, step, overallLevel,
  ringFraction, rmsToDb, smooth, formatValue, groupThousands, alertCopy, referenceFor,
} from '../assets/js/engine.js';

const cfg = (over = {}) => ({ ...defaultConfig(), sustainSec: 2, cooldownMin: 1, ...over });
const quiet = { noise: 40, light: 250, heart: 72, spo2: 98 };

// Corre una secuencia de lecturas cada 500 ms y junta los eventos.
function run(readingsList, config = cfg(), start = 0) {
  let state = createState();
  const events = [];
  readingsList.forEach((r, i) => {
    const res = step(state, r, config, start + i * 500);
    state = res.state;
    events.push(...res.events);
  });
  return { state, events };
}
const repeat = (r, n) => Array.from({ length: n }, () => ({ ...quiet, ...r }));

test('classify: max y min, pre-aviso y umbral', () => {
  const mc = { threshold: 75, preAlert: true, enabled: true };
  assert.equal(classify('noise', 60, mc), 'ok');
  assert.equal(classify('noise', 69, mc), 'pre'); // 75 - 6
  assert.equal(classify('noise', 75, mc), 'alert');
  const o2 = { threshold: 92, preAlert: true, enabled: true };
  assert.equal(classify('spo2', 97, o2), 'ok');
  assert.equal(classify('spo2', 94, o2), 'pre');
  assert.equal(classify('spo2', 92, o2), 'alert');
});

test('classify: sin pre-aviso salta de ok a alerta', () => {
  const mc = { threshold: 75, preAlert: false, enabled: true };
  assert.equal(classify('noise', 74, mc), 'ok');
  assert.equal(classify('noise', 76, mc), 'alert');
});

test('classify: la histéresis evita que el aviso parpadee alrededor del umbral', () => {
  const mc = { threshold: 75, preAlert: true, enabled: true };
  assert.equal(classify('noise', 73, mc, 'alert'), 'alert'); // dentro de 3 dB
  assert.equal(classify('noise', 71, mc, 'alert'), 'pre');
  assert.equal(classify('noise', 67, mc, 'pre'), 'pre'); // margen 6 + histéresis 3
  assert.equal(classify('noise', 65, mc, 'pre'), 'ok');
});

test('step: un pico breve no dispara aviso (debe sostenerse)', () => {
  const seq = [...repeat({}, 4), ...repeat({ noise: 95 }, 2), ...repeat({}, 10)];
  const { events } = run(seq);
  assert.equal(events.filter((e) => e.to === 'alert').length, 0);
});

test('step: ruido sostenido sube a alerta y avisa una sola vez por cooldown', () => {
  const { events, state } = run(repeat({ noise: 90 }, 20));
  const alerts = events.filter((e) => e.metric === 'noise' && e.to === 'alert');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].notify, true);
  assert.equal(alerts[0].at, 2000); // sustainSec = 2
  assert.equal(state.noise.level, 'alert');
  assert.equal(overallLevel(state), 'alert');
});

test('step: el cooldown silencia avisos repetidos y los vuelve a permitir después', () => {
  const up = repeat({ noise: 90 }, 8);
  const down = repeat({ noise: 40 }, 8);
  const seq = [...up, ...down, ...up];
  const short = run(seq, cfg({ cooldownMin: 1 }));
  assert.deepEqual(short.events.filter((e) => e.to === 'alert').map((e) => e.notify), [true, false]);
  const none = run(seq, cfg({ cooldownMin: 0 }));
  assert.deepEqual(none.events.filter((e) => e.to === 'alert').map((e) => e.notify), [true, true]);
});

test('step: una métrica apagada nunca avisa', () => {
  const c = cfg();
  c.metrics.noise.enabled = false;
  const { events, state } = run(repeat({ noise: 110 }, 20), c);
  assert.equal(events.length, 0);
  assert.equal(state.noise.level, 'ok');
});

test('step: lecturas faltantes no rompen el motor', () => {
  const { events } = run([{ noise: NaN, light: undefined, heart: 72, spo2: 98 }]);
  assert.deepEqual(events, []);
});

test('step: no muta el estado anterior', () => {
  const s0 = createState();
  const res = step(s0, { ...quiet, noise: 100 }, cfg({ sustainSec: 1 }), 0);
  assert.equal(s0.noise.pending, null);
  assert.equal(res.state.noise.pending, 'alert');
});

test('step: oxígeno bajo sostenido genera aviso', () => {
  const { events } = run(repeat({ spo2: 89 }, 10));
  assert.ok(events.some((e) => e.metric === 'spo2' && e.to === 'alert' && e.notify));
});

test('normalizeConfig: recorta valores fuera de rango y tolera basura', () => {
  const c = normalizeConfig({ sustainSec: 999, cooldownMin: -3, metrics: { noise: { threshold: 5, enabled: 'si' } }, modes: { vibrate: false } });
  assert.equal(c.sustainSec, 30);
  assert.equal(c.cooldownMin, 0);
  assert.equal(c.metrics.noise.threshold, METRICS.noise.thresholdMin);
  assert.equal(c.metrics.noise.enabled, true);
  assert.equal(c.modes.vibrate, false);
  assert.deepEqual(normalizeConfig(null), defaultConfig());
  assert.deepEqual(normalizeConfig('roto'), defaultConfig());
});

test('los umbrales por defecto están dentro de los límites del control', () => {
  for (const id of METRIC_IDS) {
    const m = METRICS[id];
    assert.ok(m.threshold >= m.thresholdMin && m.threshold <= m.thresholdMax, id);
  }
});

test('ringFraction: 0..1, monótona, logarítmica para luz', () => {
  assert.equal(ringFraction('noise', 30), 0);
  assert.equal(ringFraction('noise', 110), 1);
  assert.equal(ringFraction('noise', 500), 1);
  assert.equal(ringFraction('noise', NaN), 0);
  assert.ok(ringFraction('light', 1000) > 0.6 && ringFraction('light', 1000) < 0.8);
  assert.ok(ringFraction('heart', 120) > ringFraction('heart', 80));
});

test('rmsToDb: escala logarítmica con calibración y límites', () => {
  assert.equal(rmsToDb(1, 94), 94);
  assert.equal(rmsToDb(0.1, 94), 74);
  assert.equal(rmsToDb(0, 94), 30);
  assert.equal(rmsToDb(-1, 94), 30);
  assert.equal(rmsToDb(1e-9, 94), 30);
  assert.equal(rmsToDb(10, 94), 114);
});

test('smooth: arranca con el primer valor y se acerca al nuevo', () => {
  assert.equal(smooth(NaN, 50, 0.3), 50);
  assert.equal(smooth(50, 60, 0.5), 55);
});

test('formatValue y groupThousands en formato argentino', () => {
  assert.equal(groupThousands(362557), '362.557');
  assert.equal(groupThousands(-1500), '-1.500');
  assert.equal(formatValue('light', 2600), '2.600');
  assert.equal(formatValue('light', 2600, { compact: true }), '2,6k');
  assert.equal(formatValue('light', 12400, { compact: true }), '12k');
  assert.equal(formatValue('noise', 64.6), '65');
  assert.equal(formatValue('noise', undefined), '--');
});

test('alertCopy: cada métrica tiene texto de pre-aviso y aviso', () => {
  for (const id of METRIC_IDS) {
    for (const lvl of ['pre', 'alert']) {
      const c = alertCopy(id, lvl);
      assert.ok(c.title.length > 0 && c.title.length <= 32, `${id}/${lvl}`);
      assert.ok(c.suggestion.endsWith('.'), `${id}/${lvl}`);
    }
  }
});

test('referenceFor: devuelve la referencia cotidiana más cercana', () => {
  assert.equal(referenceFor('noise', 72), 'Parecido a una aspiradora.');
  assert.equal(referenceFor('light', 1200), 'Parecido a un supermercado.');
  assert.equal(referenceFor('spo2', 92), 'Parecido a algo bajo.');
});
