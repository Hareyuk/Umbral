// Pantalla del reloj Umbral como SVG (reloj cuadrado). Función pura: recibe datos y devuelve un string.
import { METRICS, METRIC_IDS, ringFraction, formatValue } from './engine.js';
import { PICTOS } from './pictos.js';

// Íconos de las medidas (trazo 24x24). Simples, un concepto por ícono.
export const ICON_PATHS = {
  noise: ['M4 9h3l5-4v14l-5-4H4z', 'M16 9.5a3.5 3.5 0 0 1 0 5', 'M18.5 7a7 7 0 0 1 0 10'],
  light: ['M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  spo2: ['M12 3c2.5 3.2 6 7 6 10.5a6 6 0 0 1-12 0C6 10 9.5 6.2 12 3z', 'M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5'],
  breath: ['M3 8h10a3 3 0 1 0-3-3', 'M3 12h15a3 3 0 1 1-3 3', 'M3 16h7'],
};

const pathsOf = (name) => ICON_PATHS[name] ?? PICTOS[name]?.paths ?? [];

export function iconSVG(name, cls = 'size-6') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathsOf(name).map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}

export const FACE_STYLES = {
  vivo: { label: 'Vivo', face: '#193A80', text: '#FFFFFF', muted: '#B9CCF5', track: '#1C365A', tick: '#49DE96', ok: '#49DE96', pre: '#FFD23F', alert: '#FF9A5C', tile: '#1C365A' },
  oscuro: { label: 'Oscuro', face: '#0B0F10', text: '#F4F7F6', muted: '#9FB0AE', track: '#263235', tick: '#FFFFFF', ok: '#6EE7A8', pre: '#FFC857', alert: '#FF8A7A', tile: '#1A2224' },
  contraste: { label: 'Alto contraste', face: '#000000', text: '#FFFFFF', muted: '#FFFFFF', track: '#3A3A3A', tick: '#49DE96', ok: '#5CFF9D', pre: '#FFD60A', alert: '#FF6B6B', tile: '#1F1F1F' },
  suave: { label: 'Suave', face: '#16302E', text: '#EAF4F1', muted: '#A8C3BE', track: '#24413E', tick: '#EAF4F1', ok: '#9AD9C0', pre: '#F1D38A', alert: '#F2A69A', tile: '#1F3E3B' },
};

export const LEVEL_WORD = { ok: 'Tranquilo', pre: 'Subiendo', alert: 'Mucho' };

export function defaultFace() {
  return { primary: 'noise', complications: ['heart', 'light', 'spo2'], style: 'vivo', pictograms: true, numbers: true, shape: 'cuadrado' };
}

// Forma de la pantalla: cuadrada (como Xiaomi) o redonda (como Samsung Galaxy Watch).
export const SHAPES = ['cuadrado', 'redondo'];

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
    shape: SHAPES.includes(f.shape) ? f.shape : base.shape,
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

// Geometría: caja de 216 y pantalla de 192 (cuadrada) o caja de radio 112 y pantalla de radio 98 (redonda).
const SCREEN = { x: 24, y: 24, w: 192, h: 192, r: 30 };
const ROUND = { r: 98 };
const CX = 120;
const BAR = { x: 44, y: 150, w: 152, h: 10 };
const FONT = 'Atkinson Hyperlegible, system-ui, sans-serif';
const fx = (n) => Math.round(n * 100) / 100;

function glyph(name, x, y, size, color, width = 2) {
  const s = size / 24;
  return `<g transform="translate(${fx(x - size / 2)} ${fx(y - size / 2)}) scale(${fx(s)})" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${pathsOf(name).map((d) => `<path d="${d}"/>`).join('')}</g>`;
}

function text(x, y, size, fill, content, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-family="${FONT}" ${extra}>${content}</text>`;
}

// Correa sensorial: relieves que se pueden recorrer con los dedos para autorregularse.
// Nervaduras horizontales con un punto en relieve en el centro de cada una.
export function strapTexture() {
  const ridges = [];
  const rows = (from, to) => {
    for (let y = from; y <= to; y += 10) {
      ridges.push(`<rect x="62" y="${y}" width="116" height="4" rx="2" fill="#3F4C50"/>`, `<circle cx="120" cy="${y + 2}" r="2.6" fill="#56656A"/>`);
    }
  };
  rows(-54, 2);
  rows(238, 290);
  return `<g aria-hidden="true">${ridges.join('')}</g>`;
}

function describe({ readings, levels, face, thresholds, alert, pictos }) {
  if (alert) return `Reloj Umbral. Aviso: ${alert.title}.`;
  if (pictos?.show) return `Reloj Umbral. Pictograma: ${PICTOS[pictos.show]?.label ?? ''}.`;
  if (pictos?.items) return `Reloj Umbral. Mis pictogramas: ${pictos.items.map((id) => PICTOS[id]?.label).filter(Boolean).join(', ')}.`;
  const parts = [face.primary, ...face.complications].map((id) => {
    const m = METRICS[id];
    return `${m.label} ${formatValue(id, readings[id])} ${m.unit}, ${LEVEL_WORD[levels[id] ?? 'ok'].toLowerCase()}`;
  });
  const p = METRICS[face.primary];
  return `Reloj Umbral. ${parts.join('. ')}. Tu umbral de ${p.label.toLowerCase()}: ${formatValue(face.primary, thresholds[face.primary])} ${p.unit}.`;
}

function metricsScreen({ readings, levels, face, th, st, round }) {
  const id = face.primary;
  const m = METRICS[id];
  const lvl = levels[id] ?? 'ok';
  const col = st[lvl];
  let body = '';
  if (face.pictograms) body += glyph(id, CX, 50, 26, col);
  body += text(CX, 82, 11, st.muted, m.label.toUpperCase(), 'letter-spacing="1.5" font-weight="700"');
  if (face.numbers) {
    body += text(CX, 122, 46, st.text, formatValue(id, readings[id], { compact: true }), 'font-weight="700"');
    body += text(CX, 141, 13, st.muted, m.unit);
  } else {
    body += text(CX, 126, 28, col, LEVEL_WORD[lvl], 'font-weight="700"');
  }
  // Barra de nivel con marca del umbral: más fácil de leer que un anillo.
  const f = ringFraction(id, readings[id]);
  const ft = ringFraction(id, th[id]);
  body += `<rect x="${BAR.x}" y="${BAR.y}" width="${BAR.w}" height="${BAR.h}" rx="${BAR.h / 2}" fill="${st.track}"/>`;
  body += `<rect x="${BAR.x}" y="${BAR.y}" width="${fx(Math.max(BAR.h, BAR.w * f))}" height="${BAR.h}" rx="${BAR.h / 2}" fill="${col}"/>`;
  const tx = fx(BAR.x + BAR.w * ft);
  body += `<line x1="${tx}" y1="${BAR.y - 5}" x2="${tx}" y2="${BAR.y + BAR.h + 5}" stroke="${st.tick}" stroke-width="3" stroke-linecap="round"/>`;
  // En la redonda los datos chicos van más juntos para no salirse del borde.
  const layout = round ? { 1: [120], 2: [104, 136], 3: [88, 120, 152] } : { 1: [120], 2: [96, 144], 3: [76, 120, 164] };
  const xs = layout[face.complications.length] ?? [];
  face.complications.forEach((cid, i) => {
    const c = st[levels[cid] ?? 'ok'];
    body += glyph(cid, xs[i], 180, 14, c);
    body += face.numbers
      ? text(xs[i], 204, 13, st.text, formatValue(cid, readings[cid], { compact: true }), 'font-weight="700"')
      : `<circle cx="${xs[i]}" cy="200" r="4.5" fill="${c}"/>`;
  });
  return body;
}

function alertScreen({ alert, readings, st, round }) {
  const col = st[alert.level] ?? st.alert;
  let body = '';
  if (round) {
    if (alert.tint !== false) body += `<circle cx="${CX}" cy="${CX}" r="${ROUND.r}" fill="${col}" opacity="0.18"/>`;
    body += `<circle cx="${CX}" cy="${CX}" r="${ROUND.r - 4}" fill="none" stroke="${col}" stroke-width="6"/>`;
  } else {
    if (alert.tint !== false) body += `<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="${SCREEN.r}" fill="${col}" opacity="0.18"/>`;
    body += `<rect x="${SCREEN.x + 4}" y="${SCREEN.y + 4}" width="${SCREEN.w - 8}" height="${SCREEN.h - 8}" rx="${SCREEN.r - 4}" fill="none" stroke="${col}" stroke-width="6"/>`;
  }
  const showIcon = alert.pictogram !== false;
  if (showIcon) body += glyph(alert.metric, CX, 76, 50, col, 2.2);
  wrap(alert.title, 14).slice(0, 3).forEach((line, i) => {
    body += text(CX, (showIcon ? 132 : 104) + i * 21, 18, st.text, line, 'font-weight="700"');
  });
  const v = readings[alert.metric];
  if (Number.isFinite(v)) body += text(CX, 200, 12, st.muted, `${formatValue(alert.metric, v)} ${METRICS[alert.metric].unit}`);
  return body;
}

// Celdas de la grilla según cuántos pictogramas hay: [x, y, ancho, alto].
// Cuadrada: hasta 4 en 2x2; con 5, tres angostas arriba y dos anchas abajo.
// Redonda: hasta 4 en 2x2 más chico; con 5, en círculo (solo ícono, sin etiqueta).
export function pictoCells(n, shape = 'cuadrado') {
  if (shape === 'redondo') {
    if (n <= 4) return [[53, 53, 64, 64], [123, 53, 64, 64], [53, 123, 64, 64], [123, 123, 64, 64]].slice(0, n);
    return [0, 1, 2, 3, 4].map((k) => {
      const a = ((-90 + 72 * k) * Math.PI) / 180;
      return [fx(CX + 58 * Math.cos(a) - 25), fx(CX + 58 * Math.sin(a) - 25), 50, 50];
    });
  }
  if (n <= 4) return [[32, 32, 84, 84], [124, 32, 84, 84], [32, 124, 84, 84], [124, 124, 84, 84]].slice(0, n);
  return [[30, 32, 56, 84], [92, 32, 56, 84], [154, 32, 56, 84], [30, 124, 87, 84], [123, 124, 87, 84]];
}

// Pantalla de pictogramas: grilla de hasta 5, o uno solo en grande para mostrarlo a otra persona.
function pictosScreen({ pictos, st, round }) {
  let body = '';
  if (pictos.show && PICTOS[pictos.show]) {
    body += glyph(pictos.show, CX, 96, 86, st.tick, 1.8);
    wrap(PICTOS[pictos.show].label, round ? 12 : 16).slice(0, 2).forEach((line, i) => {
      body += text(CX, 172 + i * 22, 19, st.text, line, 'font-weight="700"');
    });
    return body;
  }
  const items = (pictos.items ?? []).filter((id) => PICTOS[id]).slice(0, 5);
  const cells = pictoCells(items.length, round ? 'redondo' : 'cuadrado');
  items.forEach((id, i) => {
    const [x, y, w, h] = cells[i];
    const narrow = w < 84;
    const star = pictos.shortcut === id;
    body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${narrow ? 14 : 18}" fill="${st.tile}" stroke="${star ? st.tick : 'none'}" stroke-width="3"/>`;
    if (h < 60) {
      body += glyph(id, x + w / 2, y + h / 2, 26, st.text, 2);
    } else {
      body += glyph(id, x + w / 2, y + h * 0.4, h < 84 ? 28 : narrow ? 30 : 36, st.text, 2);
      body += text(x + w / 2, y + h - 12, narrow ? 9 : 10, st.muted, PICTOS[id].short, 'font-weight="700"');
    }
  });
  if (!items.length) body += text(CX, 124, 14, st.muted, 'Elegí pictogramas');
  return body;
}

export function watchSVG({ readings = {}, levels = {}, face: rawFace, thresholds = {}, alert = null, pictos = null } = {}) {
  const face = normalizeFace(rawFace);
  const st = FACE_STYLES[face.style];
  const th = { ...Object.fromEntries(METRIC_IDS.map((id) => [id, METRICS[id].threshold])), ...thresholds };
  const label = describe({ readings, levels, face, thresholds: th, alert, pictos });
  const round = face.shape === 'redondo';
  const body = alert ? alertScreen({ alert, readings, st, round }) : pictos ? pictosScreen({ pictos, st, round }) : metricsScreen({ readings, levels, face, th, st, round });
  const caseShape = round
    ? `<circle cx="${CX}" cy="${CX}" r="112" fill="#1E2426" stroke="#5A666B" stroke-width="3"/>\n<circle cx="${CX}" cy="${CX}" r="${ROUND.r}" fill="${st.face}"/>`
    : `<rect x="12" y="12" width="216" height="216" rx="44" fill="#1E2426" stroke="#5A666B" stroke-width="3"/>\n<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="${SCREEN.r}" fill="${st.face}"/>\n<circle cx="120" cy="17" r="3" fill="#0F1415"/>`;

  return `<svg viewBox="0 -64 240 368" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
<rect x="50" y="-64" width="140" height="120" rx="22" fill="#2C3537"/>
<rect x="50" y="184" width="140" height="120" rx="22" fill="#2C3537"/>
${strapTexture()}
<rect x="228" y="84" width="7" height="24" rx="3" fill="#5A666B"/>
${caseShape}
${body}
</svg>`;
}
