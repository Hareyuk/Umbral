// Historial de avisos: lista inmutable, más nuevo primero.
import { METRICS, METRIC_IDS } from './engine.js';

export const HISTORY_CAP = 200;

export function addEvent(list, ev, cap = HISTORY_CAP) {
  return [ev, ...list].slice(0, cap);
}

export function summarize(events) {
  const out = Object.fromEntries(METRIC_IDS.map((id) => [id, { pre: 0, alert: 0 }]));
  for (const ev of events) if (out[ev.metric] && ev.level in out[ev.metric]) out[ev.metric][ev.level] += 1;
  return out;
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function eventsToCSV(events) {
  const rows = [['fecha_hora_utc', 'medida', 'nivel', 'valor', 'unidad', 'lugar']];
  for (const ev of events) {
    const m = METRICS[ev.metric];
    rows.push([new Date(ev.at).toISOString(), m?.label ?? ev.metric, ev.level === 'alert' ? 'aviso' : 'pre-aviso', ev.value, m?.unit ?? '', ev.place]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}
