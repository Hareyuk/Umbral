import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSimulator, SCENARIO_IDS, mulberry32 } from '../assets/js/simulator.js';
import { METRICS, METRIC_IDS, defaultConfig, createState, step } from '../assets/js/engine.js';

const series = (sim, n) => Array.from({ length: n }, () => sim.next(500));
const avg = (rows, id) => rows.reduce((s, r) => s + r[id], 0) / rows.length;

test('mulberry32 es determinístico y está en [0, 1)', () => {
  const a = mulberry32(1);
  const b = mulberry32(1);
  for (let i = 0; i < 1000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test('misma semilla, misma secuencia', () => {
  assert.deepEqual(series(createSimulator({ seed: 3, scenario: 'aula' }), 50), series(createSimulator({ seed: 3, scenario: 'aula' }), 50));
});

test('todas las lecturas quedan dentro de los límites del sensor', () => {
  for (const sc of SCENARIO_IDS) {
    for (const r of series(createSimulator({ seed: 9, scenario: sc }), 300)) {
      for (const id of METRIC_IDS) assert.ok(r[id] >= METRICS[id].min && r[id] <= METRICS[id].max, `${sc} ${id}=${r[id]}`);
      assert.ok(r.spo2 <= 100);
    }
  }
});

test('los escenarios se distinguen: casa es tranquila, recital es ruidoso', () => {
  const casa = series(createSimulator({ seed: 5, scenario: 'casa' }), 200).slice(40);
  const recital = series(createSimulator({ seed: 5, scenario: 'recital' }), 200).slice(40);
  assert.ok(avg(casa, 'noise') < 50);
  assert.ok(avg(recital, 'noise') > 90);
  assert.ok(avg(recital, 'heart') > avg(casa, 'heart') + 20, 'el ruido sostenido sube el pulso');
});

test('cambiar de escenario mueve los valores de forma gradual', () => {
  const sim = createSimulator({ seed: 2, scenario: 'casa' });
  series(sim, 40);
  sim.setScenario('recital');
  const first = sim.next(500).noise;
  assert.ok(first < 70, `no salta de golpe: ${first}`);
  const later = series(sim, 60).at(-1).noise;
  assert.ok(later > 85);
});

test('escenario desconocido tira error claro', () => {
  assert.throws(() => createSimulator().setScenario('luna'), /Escenario desconocido/);
});

test('integración: en Recital con la config por defecto llega un aviso de ruido en menos de 20 s', () => {
  const sim = createSimulator({ seed: 1, scenario: 'recital' });
  const config = defaultConfig();
  let state = createState();
  let firstAlert = null;
  for (let t = 0; t <= 20000 && firstAlert === null; t += 500) {
    const res = step(state, sim.next(500), config, t);
    state = res.state;
    const ev = res.events.find((e) => e.metric === 'noise' && e.to === 'alert');
    if (ev) firstAlert = ev.at;
  }
  assert.notEqual(firstAlert, null);
});

test('integración: en Casa no hay avisos durante 2 minutos', () => {
  const sim = createSimulator({ seed: 4, scenario: 'casa' });
  const config = defaultConfig();
  let state = createState();
  const alerts = [];
  for (let t = 0; t <= 120000; t += 500) {
    const res = step(state, sim.next(500), config, t);
    state = res.state;
    alerts.push(...res.events.filter((e) => e.to === 'alert'));
  }
  assert.equal(alerts.length, 0);
});
