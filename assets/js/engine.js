// Motor de umbrales de Umbral. Lógica pura, sin DOM: la usan la landing, la app y los tests.

export const LEVELS = ['ok', 'pre', 'alert'];
const RANK = { ok: 0, pre: 1, alert: 2 };

// kind 'max': avisa cuando el valor SUBE hasta el umbral. kind 'min': cuando BAJA.
// preMargin: distancia al umbral donde empieza el pre-aviso.
// hysteresis: cuánto tiene que alejarse el valor para bajar de nivel (evita avisos intermitentes).
export const METRICS = {
  noise: {
    id: 'noise', label: 'Ruido', unit: 'dB', kind: 'max', min: 30, max: 120, range: [30, 110],
    threshold: 75, thresholdMin: 45, thresholdMax: 110, step: 1, preMargin: 6, hysteresis: 3,
  },
  light: {
    id: 'light', label: 'Luz', unit: 'lux', kind: 'max', min: 0, max: 20000, range: [0, 20000], log: true,
    threshold: 2000, thresholdMin: 200, thresholdMax: 20000, step: 100, preMargin: 600, hysteresis: 200,
  },
  heart: {
    id: 'heart', label: 'Pulso', unit: 'lpm', kind: 'max', min: 40, max: 200, range: [40, 180],
    threshold: 110, thresholdMin: 80, thresholdMax: 180, step: 1, preMargin: 10, hysteresis: 5,
  },
  spo2: {
    id: 'spo2', label: 'Oxígeno', unit: '%', kind: 'min', min: 80, max: 100, range: [80, 100],
    threshold: 92, thresholdMin: 85, thresholdMax: 96, step: 1, preMargin: 2, hysteresis: 1,
  },
};
export const METRIC_IDS = Object.keys(METRICS);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function defaultConfig() {
  const metrics = {};
  for (const m of Object.values(METRICS)) metrics[m.id] = { enabled: true, threshold: m.threshold, preAlert: true };
  return {
    sustainSec: 4, // segundos que el valor tiene que sostenerse antes de cambiar de nivel
    cooldownMin: 1, // minutos sin repetir el mismo aviso
    modes: { vibrate: true, color: true, pictogram: true, supportPerson: false },
    metrics,
  };
}

// Acepta cualquier cosa (localStorage corrupto incluido) y devuelve una config válida.
export function normalizeConfig(input) {
  const base = defaultConfig();
  const src = input && typeof input === 'object' ? input : {};
  const num = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);
  const out = {
    sustainSec: clamp(num(src.sustainSec, base.sustainSec), 1, 30),
    cooldownMin: clamp(num(src.cooldownMin, base.cooldownMin), 0, 30),
    modes: {},
    metrics: {},
  };
  for (const k of Object.keys(base.modes)) out.modes[k] = bool(src.modes?.[k], base.modes[k]);
  for (const id of METRIC_IDS) {
    const m = METRICS[id];
    const s = src.metrics?.[id] ?? {};
    out.metrics[id] = {
      enabled: bool(s.enabled, true),
      threshold: clamp(num(s.threshold, m.threshold), m.thresholdMin, m.thresholdMax),
      preAlert: bool(s.preAlert, true),
    };
  }
  return out;
}

export function thresholdsOf(config) {
  return Object.fromEntries(METRIC_IDS.map((id) => [id, config.metrics[id].threshold]));
}

// Nivel instantáneo de una lectura, considerando histéresis respecto del nivel actual.
export function classify(id, value, mc, current = 'ok') {
  const m = METRICS[id];
  const d = m.kind === 'max' ? value - mc.threshold : mc.threshold - value; // d >= 0: en o pasado el umbral
  if (d >= 0) return 'alert';
  if (current === 'alert' && d > -m.hysteresis) return 'alert';
  if (mc.preAlert) {
    if (d >= -m.preMargin) return 'pre';
    if (current !== 'ok' && d > -(m.preMargin + m.hysteresis)) return 'pre';
  }
  return 'ok';
}

export function createState() {
  return Object.fromEntries(
    METRIC_IDS.map((id) => [id, { level: 'ok', pending: null, pendingSince: 0, lastNotify: { pre: -Infinity, alert: -Infinity } }]),
  );
}

// Avanza el estado con una nueva lectura. No muta `prev`.
// Un cambio de nivel solo ocurre si el nuevo nivel se sostiene `sustainSec` segundos.
// Devuelve eventos de cambio de nivel; `notify` indica si corresponde avisar (respeta cooldown).
export function step(prev, readings, config, now) {
  const state = structuredClone(prev);
  const events = [];
  const sustainMs = config.sustainSec * 1000;
  const cooldownMs = config.cooldownMin * 60000;
  for (const id of METRIC_IDS) {
    const s = state[id];
    const mc = config.metrics[id];
    const v = readings[id];
    if (!mc.enabled || !Number.isFinite(v)) {
      s.level = 'ok';
      s.pending = null;
      continue;
    }
    const target = classify(id, v, mc, s.level);
    if (target === s.level) {
      s.pending = null;
      continue;
    }
    const up = RANK[target] > RANK[s.level];
    const pendingUp = s.pending !== null && RANK[s.pending] > RANK[s.level];
    if (s.pending === null || pendingUp !== up) s.pendingSince = now;
    s.pending = target;
    if (now - s.pendingSince < sustainMs) continue;
    const from = s.level;
    s.level = target;
    s.pending = null;
    let notify = false;
    if (up && now - s.lastNotify[target] >= cooldownMs) {
      notify = true;
      s.lastNotify[target] = now;
    }
    events.push({ metric: id, from, to: target, value: v, at: now, escalated: up, notify });
  }
  return { state, events };
}

export function levelsOf(state) {
  return Object.fromEntries(METRIC_IDS.map((id) => [id, state[id].level]));
}

export function overallLevel(state) {
  return METRIC_IDS.reduce((acc, id) => (RANK[state[id].level] > RANK[acc] ? state[id].level : acc), 'ok');
}

// Posición 0..1 de un valor en el anillo del reloj. La luz usa escala logarítmica.
export function ringFraction(id, value) {
  const m = METRICS[id];
  if (!Number.isFinite(value)) return 0;
  const [lo, hi] = m.range;
  const v = clamp(value, lo, hi);
  if (m.log) return Math.log10(v + 1) / Math.log10(hi + 1);
  return (v - lo) / (hi - lo);
}

// RMS de una señal de audio (0..1) a decibeles aproximados.
// `offset` calibra dBFS a dB SPL; ~94 es un valor típico para micrófonos de teléfono.
export function rmsToDb(rms, offset = 94) {
  const m = METRICS.noise;
  if (!(rms > 0)) return m.min;
  return Math.round(clamp(20 * Math.log10(rms) + offset, m.min, m.max) * 10) / 10;
}

// Media móvil exponencial. alpha 0..1: cuánto pesa el valor nuevo.
export function smooth(prev, next, alpha) {
  if (!Number.isFinite(prev)) return next;
  return prev + (next - prev) * alpha;
}

export function groupThousands(n) {
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return n < 0 ? `-${s}` : s;
}

export function formatValue(id, v, { compact = false } = {}) {
  if (!Number.isFinite(v)) return '--';
  if (id === 'light' && compact && v >= 1000) {
    const k = v / 1000;
    return `${k >= 10 ? Math.round(k) : String(Math.round(k * 10) / 10).replace('.', ',')}k`;
  }
  return groupThousands(v);
}

// Referencias cotidianas para entender un valor ("75 dB es como una aspiradora").
export const REFERENCES = {
  noise: [[40, 'una biblioteca'], [60, 'una conversación'], [70, 'una aspiradora'], [85, 'tránsito intenso'], [100, 'un recital']],
  light: [[300, 'el living de casa'], [500, 'una oficina'], [1000, 'un supermercado'], [10000, 'un día nublado afuera'], [20000, 'el sol directo']],
  heart: [[80, 'estar en reposo'], [100, 'caminar rápido'], [130, 'correr'], [160, 'un esfuerzo muy fuerte']],
  spo2: [[96, 'lo habitual'], [92, 'algo bajo'], [88, 'bajo: conviene pedir ayuda']],
};

export function referenceFor(id, value) {
  const m = METRICS[id];
  const dist = (a) => (m.log ? Math.abs(Math.log10(a + 1) - Math.log10(value + 1)) : Math.abs(a - value));
  const [, label] = REFERENCES[id].reduce((best, r) => (dist(r[0]) < dist(best[0]) ? r : best));
  return `Parecido a ${label}.`;
}

// Textos de aviso en lenguaje claro y primera persona (pautas de historia social del Manual de Accesibilidad BA).
const COPY = {
  noise: {
    pre: ['El ruido está subiendo', 'Puedo ir buscando los auriculares.'],
    alert: ['Hay mucho ruido', 'Puedo ponerme los auriculares o ir a un lugar tranquilo.'],
  },
  light: {
    pre: ['La luz está subiendo', 'Puedo buscar un lugar con sombra.'],
    alert: ['Hay mucha luz', 'Puedo usar anteojos de sol o una gorra.'],
  },
  heart: {
    pre: ['Mi corazón se está acelerando', 'Puedo hacer una pausa.'],
    alert: ['Mi corazón late rápido', 'Puedo respirar despacio un minuto.'],
  },
  spo2: {
    pre: ['Mi oxígeno está bajando', 'Puedo sentarme y respirar con calma.'],
    alert: ['Oxígeno bajo', 'Aviso a mi familia.'],
  },
};

export function alertCopy(id, level) {
  const [title, suggestion] = COPY[id]?.[level] ?? ['Todo tranquilo', ''];
  return { title, suggestion };
}
