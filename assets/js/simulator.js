// Simulador de sensores del reloj. Determinístico por semilla: misma semilla, misma secuencia.
import { METRICS, METRIC_IDS } from './engine.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [media, desvío] por sensor. `spike`: probabilidad por lectura de un pico breve (timbre, bocina, flash).
export const SCENARIOS = {
  casa: { label: 'Casa', noise: [40, 3], light: [250, 40], heart: [72, 3], spo2: [98, 0.4], spike: { p: 0.01, noise: 12 } },
  aula: { label: 'Aula', noise: [62, 5], light: [500, 60], heart: [80, 4], spo2: [97.5, 0.5], spike: { p: 0.04, noise: 15 } },
  colectivo: { label: 'Colectivo', noise: [74, 5], light: [700, 150], heart: [84, 4], spo2: [97.5, 0.5], spike: { p: 0.06, noise: 12 } },
  super: { label: 'Supermercado', noise: [69, 4], light: [1600, 150], heart: [86, 4], spo2: [97.5, 0.5], spike: { p: 0.05, noise: 10, light: 800 } },
  recreo: { label: 'Recreo', noise: [82, 6], light: [12000, 2500], heart: [95, 5], spo2: [97, 0.6], spike: { p: 0.08, noise: 10 } },
  recital: { label: 'Recital', noise: [97, 4], light: [400, 250], heart: [104, 5], spo2: [96.5, 0.7], spike: { p: 0.1, noise: 6, light: 3000 } },
};
export const SCENARIO_IDS = Object.keys(SCENARIOS);

const SPIKE_TICKS = 4;
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

export function createSimulator({ seed = 7, scenario = 'casa', tauMs = 2500 } = {}) {
  const rand = mulberry32(seed);
  let spare = null;
  const gauss = () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    while (u === 0) u = rand();
    const v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };

  let current = SCENARIOS[scenario] ? scenario : 'casa';
  let spikeLeft = 0;
  const values = Object.fromEntries(METRIC_IDS.map((id) => [id, SCENARIOS[current][id][0]]));

  return {
    get scenario() {
      return current;
    },
    setScenario(id) {
      if (!SCENARIOS[id]) throw new Error(`Escenario desconocido: ${id}`);
      current = id;
    },
    // Avanza dtMs milisegundos. Los valores se acercan suavemente al escenario (no saltan).
    next(dtMs = 500) {
      const s = SCENARIOS[current];
      const alpha = 1 - Math.exp(-dtMs / tauMs);
      if (spikeLeft === 0 && rand() < s.spike.p) spikeLeft = SPIKE_TICKS;
      const spiking = spikeLeft > 0;
      if (spiking) spikeLeft -= 1;
      for (const id of METRIC_IDS) {
        const [mean, sd] = s[id];
        let target = mean + gauss() * sd + (spiking ? s.spike[id] ?? 0 : 0);
        // El ruido sostenido acelera el pulso: modela el estrés de la sobrecarga.
        if (id === 'heart') target += Math.max(0, values.noise - 70) * 0.35;
        const m = METRICS[id];
        values[id] = Math.min(m.max, Math.max(m.min, values[id] + (target - values[id]) * alpha));
      }
      return {
        noise: round(values.noise, 1),
        light: Math.round(values.light),
        heart: Math.round(values.heart),
        spo2: Math.min(100, Math.round(values.spo2)),
      };
    },
  };
}
