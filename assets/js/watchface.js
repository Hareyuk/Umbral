// Esfera del reloj como SVG. Función pura: recibe datos y devuelve un string.
import { METRICS, METRIC_IDS, ringFraction, formatValue } from './engine.js';

// Pictogramas propios (trazo 24x24). Simples, un concepto por ícono.
export const ICON_PATHS = {
  noise: ['M4 9h3l5-4v14l-5-4H4z', 'M16 9.5a3.5 3.5 0 0 1 0 5', 'M18.5 7a7 7 0 0 1 0 10'],
  light: ['M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  spo2: ['M12 3c2.5 3.2 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9.5 6.2 12 3z', 'M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5'],
  breath: ['M3 8h10a3 3 0 1 0-3-3', 'M3 12h15a3 3 0 1 1-3 3', 'M3 16h7'],
};

export function iconSVG(name, cls = 'size-6') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name].map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}

export const FACE_STYLES = {
  vivo: { label: 'Vivo', face: '#0A2A6B', text: '#FFFFFF', muted: '#B9CCF5', track: '#1B3F8F', tick: '#FFD23F', ok: '#7CF0B4', pre: '#FFD23F', alert: '#FF9A5C', stroke: 12 },
  oscuro: { label: 'Oscuro', face: '#0B0F10', text: '#F4F7F6', muted: '#9FB0AE', track: '#263235', tick: '#FFFFFF', ok: '#6EE7A8', pre: '#FFC857', alert: '#FF8A7A', stroke: 12 },
  contraste: { label: 'Alto contraste', face: '#000000', text: '#FFFFFF', muted: '#FFFFFF', track: '#3A3A3A', tick: '#FFD60A', ok: '#5CFF9D', pre: '#FFD60A', alert: '#FF6B6B', stroke: 15 },
  suave: { label: 'Suave', face: '#16302E', text: '#EAF4F1', muted: '#A8C3BE', track: '#24413E', tick: '#EAF4F1', ok: '#9AD9C0', pre: '#F1D38A', alert: '#F2A69A', stroke: 12 },
};

export const LEVEL_WORD = { ok: 'Tranquilo', pre: 'Subiendo', alert: 'Mucho' };

export function defaultFace() {
  return { primary: 'noise', complications: ['heart', 'light', 'spo2'], style: 'vivo', pictograms: true, numbers: true };
}

export function normalizeFace(input) {
  const base = defaultFace();
  const f = input && typeof input === 'object' ? input : {};
  const primary = METRICS[f.primary] ? f.primary : base.primary;
  const list = Array.isArray(f.complications) ? f.complications : base.complications;
  const complications = [...new Set(list)].filter((id) => METRICS[id] && id !== primary).slice(0, 3);
  return {
    primary,
    complications,
    style: FACE_STYLES[f.style] ? f.style : base.style,
    pictograms: typeof f.pictograms === 'boolean' ? f.pictograms : base.pictograms,
    numbers: typeof f.numbers === 'boolean' ? f.numbers : base.numbers,
  };
}

// Corta un texto en líneas de hasta `max` caracteres sin partir palabras.
export function wrap(text, max) {
  const lines = [];
  for (const word of text.split(/\s+/)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

const CX = 120;
const CY = 120;
const R = 86;
const C = 2 * Math.PI * R;
const GAUGE = 300; // grados del anillo; el hueco queda abajo para los datos chicos
const START = 120;
const G = (C * GAUGE) / 360;
const FONT = "Atkinson Hyperlegible, system-ui, sans-serif";
const fx = (n) => Math.round(n * 100) / 100;

function polar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [fx(CX + r * Math.cos(a)), fx(CY + r * Math.sin(a))];
}

function glyph(name, x, y, size, color, width = 2) {
  const s = size / 24;
  return `<g transform="translate(${fx(x - size / 2)} ${fx(y - size / 2)}) scale(${fx(s)})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name].map((d) => `<path d="${d}"/>`).join('')}</g>`;
}

function text(x, y, size, fill, content, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-family="${FONT}" ${extra}>${content}</text>`;
}

function describe({ readings, levels, face, thresholds, alert }) {
  if (alert) return `Reloj Umbral. Aviso: ${alert.title}.`;
  const parts = [face.primary, ...face.complications].map((id) => {
    const m = METRICS[id];
    return `${m.label} ${formatValue(id, readings[id])} ${m.unit}, ${LEVEL_WORD[levels[id] ?? 'ok'].toLowerCase()}`;
  });
  const p = METRICS[face.primary];
  return `Reloj Umbral. ${parts.join('. ')}. Tu umbral de ${p.label.toLowerCase()}: ${formatValue(face.primary, thresholds[face.primary])} ${p.unit}.`;
}

export function watchSVG({ readings = {}, levels = {}, face: rawFace, thresholds = {}, alert = null } = {}) {
  const face = normalizeFace(rawFace);
  const st = FACE_STYLES[face.style];
  const th = { ...Object.fromEntries(METRIC_IDS.map((id) => [id, METRICS[id].threshold])), ...thresholds };
  const label = describe({ readings, levels, face, thresholds: th, alert });
  const arc = (frac, color) =>
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${color}" stroke-width="${st.stroke}" stroke-linecap="round" stroke-dasharray="${fx(Math.max(0.01, G * frac))} ${fx(C)}" transform="rotate(${START} ${CX} ${CY})"/>`;

  let body = arc(1, st.track);
  if (alert) {
    const col = st[alert.level] ?? st.alert;
    if (alert.tint !== false) body += `<circle cx="${CX}" cy="${CY}" r="100" fill="${col}" opacity="0.16"/>`;
    body += arc(1, col);
    const showIcon = alert.pictogram !== false;
    if (showIcon) body += glyph(alert.metric, CX, 84, 50, col, 2.2);
    wrap(alert.title, 13).slice(0, 3).forEach((line, i) => {
      body += text(CX, (showIcon ? 136 : 108) + i * 20, 17, st.text, line, 'font-weight="700"');
    });
    const v = readings[alert.metric];
    if (Number.isFinite(v)) body += text(CX, 196, 12, st.muted, `${formatValue(alert.metric, v)} ${METRICS[alert.metric].unit}`);
  } else {
    const id = face.primary;
    const m = METRICS[id];
    const lvl = levels[id] ?? 'ok';
    const col = st[lvl];
    body += arc(ringFraction(id, readings[id]), col);
    const ang = START + GAUGE * ringFraction(id, th[id]);
    const [x1, y1] = polar(R - st.stroke, ang);
    const [x2, y2] = polar(R + st.stroke, ang);
    body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${st.tick}" stroke-width="3" stroke-linecap="round"/>`;
    if (face.pictograms) body += glyph(id, CX, 64, 26, col);
    body += text(CX, 95, 11, st.muted, m.label.toUpperCase(), 'letter-spacing="1.5" font-weight="700"');
    if (face.numbers) {
      body += text(CX, 137, 44, st.text, formatValue(id, readings[id], { compact: true }), 'font-weight="700"');
      body += text(CX, 156, 13, st.muted, m.unit);
    } else {
      body += text(CX, 136, 26, col, LEVEL_WORD[lvl], 'font-weight="700"');
    }
    const xs = { 1: [120], 2: [104, 136], 3: [92, 120, 148] }[face.complications.length] ?? [];
    face.complications.forEach((cid, i) => {
      const c = st[levels[cid] ?? 'ok'];
      body += glyph(cid, xs[i], 177, 13, c);
      body += face.numbers
        ? text(xs[i], 198, 12, st.text, formatValue(cid, readings[cid], { compact: true }), 'font-weight="700"')
        : `<circle cx="${xs[i]}" cy="194" r="4" fill="${c}"/>`;
    });
  }

  return `<svg viewBox="0 -64 240 368" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
<rect x="74" y="-64" width="92" height="110" rx="20" fill="#2C3537"/>
<rect x="74" y="194" width="92" height="110" rx="20" fill="#2C3537"/>
<rect x="229" y="86" width="7" height="20" rx="3" fill="#5A666B"/>
<rect x="229" y="132" width="7" height="20" rx="3" fill="#5A666B"/>
<circle cx="${CX}" cy="${CY}" r="113" fill="#1E2426" stroke="#5A666B" stroke-width="3"/>
<circle cx="${CX}" cy="${CY}" r="104" fill="${st.face}"/>
${body}
</svg>`;
}
