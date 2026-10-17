// Rutinas paso a paso. Lógica pura: la app las edita y el reloj muestra un paso por vez.
// Versión provisoria hasta tener el diseño final de Figma.
import { PICTOS } from './pictos.js';

// Íconos extra para pasos de rutina (trazo 24x24). También se pueden usar los pictogramas de comunicación.
export const ROUTINE_ICONS = {
  despertar: { label: 'Despertarse', paths: ['M3 18h18', 'M6 18a6 6 0 0 1 12 0', 'M12 6v2', 'M5.6 9.6l1.4 1.4', 'M18.4 9.6L17 11'] },
  dientes: { label: 'Lavarse los dientes', paths: ['M4 20l9-9', 'M11 9l4 4 5-5-4-4z', 'M15 7l2 2'] },
  ropa: { label: 'Vestirse', paths: ['M8 4L3 7l2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z'] },
  mochila: { label: 'Mochila', paths: ['M6 9a6 6 0 0 1 12 0v11H6z', 'M9 9V6a3 3 0 0 1 6 0v3', 'M9 14h6'] },
  colectivo: { label: 'Colectivo', paths: ['M5 4h14v12H5z', 'M5 10h14', 'M7 16v3', 'M17 16v3', 'M8 13h.01', 'M16 13h.01'] },
  escuela: { label: 'Escuela', paths: ['M12 7v13', 'M12 7a4 4 0 0 0-4-2H3v13h5a4 4 0 0 1 4 2', 'M12 7a4 4 0 0 1 4-2h5v13h-5a4 4 0 0 0-4 2'] },
  ducha: { label: 'Bañarse', paths: ['M4 20V8a4 4 0 0 1 8 0', 'M9 8h6', 'M11 12v1M14 12v1M17 12v1M11 16v1M14 16v1M17 16v1'] },
  dormir: { label: 'Dormir', paths: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'] },
  jugar: { label: 'Jugar', paths: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M3 12h18', 'M12 3c3 3 3 15 0 18', 'M12 3c-3 3-3 15 0 18'] },
  carrito: { label: 'Supermercado', paths: ['M3 4h2l2 11h11l2-8H6', 'M9 20h.01', 'M17 20h.01'] },
};

// Todos los íconos que se pueden elegir para un paso: los de rutina y los pictogramas de comunicación.
export const STEP_ICONS = {
  ...Object.fromEntries(Object.entries(ROUTINE_ICONS).map(([id, i]) => [id, i.label])),
  ...Object.fromEntries(Object.entries(PICTOS).map(([id, p]) => [id, p.short])),
};

export const MAX_ROUTINES = 10;
export const MAX_STEPS = 12;
export const MAX_NAME = 30;
export const MAX_STEP_TEXT = 40;

let counter = 0;
const newId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

export function defaultRoutines() {
  return [
    {
      id: 'manana',
      name: 'Mañana de escuela',
      steps: [
        { icon: 'despertar', text: 'Me despierto' },
        { icon: 'bano', text: 'Voy al baño' },
        { icon: 'dientes', text: 'Me lavo los dientes' },
        { icon: 'ropa', text: 'Me visto' },
        { icon: 'comer', text: 'Desayuno' },
        { icon: 'mochila', text: 'Preparo la mochila' },
        { icon: 'colectivo', text: 'Voy a la escuela' },
      ],
    },
    {
      id: 'super',
      name: 'Ir al supermercado',
      steps: [
        { icon: 'auriculares', text: 'Llevo mis auriculares' },
        { icon: 'carrito', text: 'Entro al súper' },
        { icon: 'pausa', text: 'Si hay mucho ruido, hago una pausa' },
        { icon: 'casa', text: 'Vuelvo a casa' },
      ],
    },
    {
      id: 'noche',
      name: 'Antes de dormir',
      steps: [
        { icon: 'ducha', text: 'Me baño' },
        { icon: 'ropa', text: 'Me pongo el pijama' },
        { icon: 'dientes', text: 'Me lavo los dientes' },
        { icon: 'dormir', text: 'Me acuesto' },
      ],
    },
  ];
}

const cleanText = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function normalizeStep(s) {
  const icon = STEP_ICONS[s?.icon] ? s.icon : 'pausa';
  return { icon, text: cleanText(s?.text, MAX_STEP_TEXT) };
}

// Acepta cualquier cosa (localStorage corrupto incluido). Sin nombre o sin pasos con texto, la rutina se descarta.
export function normalizeRoutines(input) {
  if (!Array.isArray(input)) return defaultRoutines();
  const seen = new Set();
  const out = [];
  for (const r of input) {
    if (!r || typeof r !== 'object' || out.length >= MAX_ROUTINES) continue;
    const name = cleanText(r.name, MAX_NAME);
    const steps = (Array.isArray(r.steps) ? r.steps : []).map(normalizeStep).filter((s) => s.text).slice(0, MAX_STEPS);
    if (!name || !steps.length) continue;
    // Un id repetido (o ausente) se reemplaza, así cada rutina se puede editar y borrar sola.
    const id = typeof r.id === 'string' && r.id && !seen.has(r.id) ? r.id : newId();
    seen.add(id);
    out.push({ id, name, steps });
  }
  return out;
}

export function newRoutine() {
  return { id: newId(), name: 'Nueva rutina', steps: [{ icon: 'despertar', text: 'Primer paso' }] };
}

// Edición sin mutar: cada función devuelve una rutina nueva.
export function addStep(r) {
  if (r.steps.length >= MAX_STEPS) return r;
  return { ...r, steps: [...r.steps, { icon: 'pausa', text: 'Nuevo paso' }] };
}

export function removeStep(r, i) {
  if (r.steps.length <= 1) return r;
  return { ...r, steps: r.steps.filter((_, k) => k !== i) };
}

export function moveStep(r, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= r.steps.length) return r;
  const steps = [...r.steps];
  [steps[i], steps[j]] = [steps[j], steps[i]];
  return { ...r, steps };
}

export function updateStep(r, i, patch) {
  return { ...r, steps: r.steps.map((s, k) => (k === i ? normalizeStep({ ...s, ...patch }) : s)) };
}

// Recorrido de una rutina: qué muestra el reloj en cada momento.
export function startRun(routine) {
  return { id: routine.id, index: 0, done: false };
}

export function advance(run, routine, dir = 1) {
  if (run.done) return run;
  const index = run.index + dir;
  if (index < 0) return { ...run, index: 0 };
  if (index >= routine.steps.length) return { ...run, done: true };
  return { ...run, index };
}

// Datos para la pantalla del reloj.
export function runScreen(run, routine) {
  if (!run || !routine) return null;
  if (run.done) return { name: routine.name, done: true, total: routine.steps.length };
  const step = routine.steps[run.index];
  return { name: routine.name, icon: step.icon, text: step.text, index: run.index, total: routine.steps.length, done: false };
}
