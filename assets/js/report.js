// Informe semanal del historial en PDF, sin dependencias. Función pura: devuelve los bytes del archivo.
// Usa Helvetica (fuente estándar de PDF) con codificación WinAnsi para tildes y ñ.
import { METRICS, METRIC_IDS, formatValue } from './engine.js';
import { summarize, visibleEvents } from './history.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (t) => {
  const d = new Date(t);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const fmtTime = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Texto a bytes WinAnsi (Latin-1 cubre tildes, ñ, ü, ¿ y ¡). Lo que no entra se reemplaza por "?".
function winAnsi(str) {
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    out.push(c < 256 ? c : ch === '·' ? 0xb7 : 0x3f);
  }
  return out;
}
const escapePdf = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

// Líneas del informe: [tamaño, negrita, texto]. Separado del PDF para poder testearlo.
export function reportLines(events, { now = Date.now(), name = '' } = {}) {
  const week = visibleEvents(events, { now, days: 7 });
  const sum = summarize(week);
  const lines = [
    [20, true, 'Umbral · Informe semanal'],
    [11, false, `${name.trim() ? `${name.trim()} · ` : ''}Del ${fmtDate(now - 6 * DAY_MS)} al ${fmtDate(now)}`],
    [11, false, ''],
    [14, true, 'Resumen de la semana'],
  ];
  for (const id of METRIC_IDS) {
    const n = (k, word) => `${k} ${word}${k === 1 ? '' : 's'}`;
    lines.push([11, false, `${METRICS[id].label}: ${n(sum[id].alert, 'aviso')} y ${n(sum[id].pre, 'pre-aviso')}`]);
  }
  const places = {};
  for (const ev of week) if (ev.level === 'alert') places[ev.place] = (places[ev.place] ?? 0) + 1;
  const top = Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 3);
  lines.push([11, false, ''], [14, true, 'Lugares con más avisos']);
  if (top.length) top.forEach(([place, n]) => lines.push([11, false, `${place}: ${n}`]));
  else lines.push([11, false, 'Sin avisos esta semana.']);
  lines.push([11, false, ''], [14, true, 'Últimos avisos']);
  const recent = week.slice(0, 22);
  if (recent.length) {
    for (const ev of recent) {
      const m = METRICS[ev.metric];
      lines.push([10, false, `${fmtDate(ev.at)} ${fmtTime(ev.at)}   ${ev.level === 'alert' ? 'Aviso' : 'Pre-aviso'}   ${m.label} ${formatValue(ev.metric, ev.value)} ${m.unit}   ${ev.place ?? ''}`]);
    }
  } else lines.push([11, false, 'Todavía no hay avisos registrados.']);
  lines.push([11, false, ''], [9, false, 'Generado por Umbral. Es un registro de apoyo para compartir con tu terapeuta; no es un informe médico.']);
  return lines;
}

export function buildWeeklyReportPDF(events, opts = {}) {
  const lines = reportLines(events, opts);
  // Contenido de la página A4 (595 x 842 puntos), de arriba hacia abajo.
  let y = 790;
  const ops = ['BT'];
  for (const [size, bold, txt] of lines) {
    y -= size + 7;
    if (y < 50) break;
    ops.push(`/${bold ? 'F2' : 'F1'} ${size} Tf`, `1 0 0 1 50 ${y} Tm`, `(${escapePdf(txt)}) Tj`);
  }
  ops.push('ET');
  const content = winAnsi(ops.join('\n'));

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    null, // contenido, se arma con bytes
  ];
  const bytes = [];
  const push = (arr) => bytes.push(...arr);
  const ascii = (s) => push([...s].map((c) => c.charCodeAt(0)));
  ascii('%PDF-1.4\n');
  push([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]); // marca binaria recomendada
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(bytes.length);
    ascii(`${i + 1} 0 obj\n`);
    if (obj === null) {
      ascii(`<< /Length ${content.length} >>\nstream\n`);
      push(content);
      ascii('\nendstream');
    } else ascii(obj);
    ascii('\nendobj\n');
  });
  const xref = bytes.length;
  ascii(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((o) => ascii(`${String(o).padStart(10, '0')} 00000 n \n`));
  ascii(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Uint8Array.from(bytes);
}
