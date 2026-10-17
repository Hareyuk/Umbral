import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTINE_ICONS, STEP_ICONS, MAX_STEPS, MAX_ROUTINES, defaultRoutines, normalizeRoutines, newRoutine,
  addStep, removeStep, moveStep, updateStep, startRun, advance, runScreen,
} from '../assets/js/routines.js';
import { watchSVG, defaultFace } from '../assets/js/watchface.js';

test('rutinas: las de ejemplo son válidas, en primera persona y con íconos existentes', () => {
  const list = defaultRoutines();
  assert.deepEqual(normalizeRoutines(list), list, 'normalizar no cambia las de ejemplo');
  for (const r of list) for (const s of r.steps) assert.ok(STEP_ICONS[s.icon], `${r.name}: ícono ${s.icon}`);
  assert.deepEqual(list.map((r) => r.name), ['Mañana de escuela', 'Ir al supermercado', 'Antes de dormir']);
});

test('rutinas: cada ícono de rutina tiene nombre y dibujo', () => {
  for (const [id, i] of Object.entries(ROUTINE_ICONS)) assert.ok(i.label && i.paths.length, id);
});

test('rutinas: normalizar tolera basura y respeta los límites', () => {
  assert.deepEqual(normalizeRoutines('roto'), defaultRoutines());
  assert.deepEqual(normalizeRoutines([]), [], 'una lista vacía queda vacía (el usuario borró todas)');
  const r = normalizeRoutines([
    { id: 'a', name: '  Mi   rutina  ', steps: [{ icon: 'inventado', text: ' Paso ' }, { icon: 'si', text: '' }] },
    { id: 'a', name: 'Duplicada', steps: [{ icon: 'si', text: 'x' }] },
    { name: '', steps: [{ icon: 'si', text: 'sin nombre' }] },
    { name: 'Sin pasos', steps: [] },
    null,
  ]);
  assert.equal(r.length, 2);
  assert.equal(r[0].name, 'Mi rutina');
  assert.deepEqual(r[0].steps, [{ icon: 'pausa', text: 'Paso' }], 'ícono desconocido pasa a pausa; pasos vacíos se descartan');
  assert.notEqual(r[1].id, 'a', 'ids repetidos se renuevan');
  const muchas = Array.from({ length: 15 }, (_, i) => ({ name: `R${i}`, steps: Array.from({ length: 20 }, () => ({ icon: 'si', text: 'ok' })) }));
  const n = normalizeRoutines(muchas);
  assert.equal(n.length, MAX_ROUTINES);
  assert.equal(n[0].steps.length, MAX_STEPS);
});

test('rutinas: editar pasos sin mutar la original', () => {
  const r = newRoutine();
  const r2 = addStep(r);
  assert.equal(r.steps.length, 1);
  assert.equal(r2.steps.length, 2);
  const r3 = updateStep(r2, 1, { text: 'Segundo', icon: 'dormir' });
  assert.deepEqual(r3.steps[1], { icon: 'dormir', text: 'Segundo' });
  assert.deepEqual(moveStep(r3, 1, -1).steps.map((s) => s.text), ['Segundo', 'Primer paso']);
  assert.equal(moveStep(r3, 0, -1), r3, 'no se mueve fuera de la lista');
  assert.equal(removeStep(r3, 0).steps.length, 1);
  assert.equal(removeStep(newRoutine(), 0).steps.length, 1, 'siempre queda al menos un paso');
  let full = newRoutine();
  for (let i = 0; i < 20; i++) full = addStep(full);
  assert.equal(full.steps.length, MAX_STEPS);
});

test('rutinas: recorrido paso a paso hasta terminar', () => {
  const r = defaultRoutines()[2]; // 4 pasos
  let run = startRun(r);
  assert.deepEqual(runScreen(run, r), { name: 'Antes de dormir', icon: 'ducha', text: 'Me baño', index: 0, total: 4, done: false });
  assert.equal(advance(run, r, -1).index, 0, 'no retrocede antes del primero');
  for (let i = 0; i < 3; i++) run = advance(run, r);
  assert.equal(runScreen(run, r).text, 'Me acuesto');
  run = advance(run, r);
  assert.equal(run.done, true);
  assert.deepEqual(runScreen(run, r), { name: 'Antes de dormir', done: true, total: 4 });
  assert.equal(advance(run, r), run, 'terminada no avanza más');
});

test('reloj: pantalla de rutina con paso, texto y puntos de progreso', () => {
  const r = defaultRoutines()[0];
  const run = advance(startRun(r), r);
  for (const shape of ['cuadrado', 'redondo']) {
    const svg = watchSVG({ face: { ...defaultFace(), shape }, routine: runScreen(run, r) });
    assert.match(svg, /aria-label="Reloj Umbral\. Rutina Mañana de escuela, paso 2 de 7: Voy al baño\."/);
    assert.ok(svg.includes('>PASO 2 DE 7<'));
    assert.equal((svg.match(/cy="203" r="[34]"/g) ?? []).length, 7, `${shape}: un punto por paso`);
    // Los puntos entran en la pantalla.
    const xs = [...svg.matchAll(/<circle cx="([\d.]+)" cy="203"/g)].map((m) => Number(m[1]));
    const half = shape === 'redondo' ? Math.sqrt(98 ** 2 - 83 ** 2) : 96;
    assert.ok(Math.max(...xs.map((x) => Math.abs(x - 120))) + 4 <= half, `${shape}: puntos dentro del borde`);
  }
  const done = watchSVG({ face: defaultFace(), routine: { name: 'X', done: true, total: 3 } });
  assert.ok(done.includes('¡Terminaste!'));
});

test('reloj: un aviso tiene prioridad sobre la rutina', () => {
  const r = defaultRoutines()[0];
  const svg = watchSVG({ face: defaultFace(), routine: runScreen(startRun(r), r), alert: { metric: 'noise', level: 'alert', title: 'Hay mucho ruido' } });
  assert.match(svg, /Aviso: Hay mucho ruido/);
  assert.ok(!svg.includes('PASO 1'));
});
