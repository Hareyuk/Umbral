// App demo de Umbral. Une el simulador, el motor de umbrales y la esfera con los formularios estáticos de app/index.html.
import {
  METRICS, METRIC_IDS, defaultConfig, normalizeConfig, createState, step, levelsOf, overallLevel,
  thresholdsOf, alertCopy, formatValue, rmsToDb, smooth, referenceFor,
} from './engine.js';
import { createSimulator, SCENARIOS } from './simulator.js';
import { watchSVG, normalizeFace, iconSVG } from './watchface.js';
import { addEvent, summarize, eventsToCSV } from './history.js';
import { initUI } from './ui.js';

initUI();

const STORE = 'umbral:app';
const TICK_MS = 500;
const SPARK = 60;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}');
  } catch {
    return {};
  }
}
const saved = load();
const app = {
  config: normalizeConfig(saved.config),
  face: normalizeFace(saved.face),
  profile: { supportName: '', micOffset: 94, ...saved.profile },
  events: Array.isArray(saved.events) ? saved.events : [],
  scenario: SCENARIOS[saved.scenario] ? saved.scenario : 'casa',
  state: createState(),
  readings: {},
  spark: Object.fromEntries(METRIC_IDS.map((id) => [id, []])),
  alert: null,
  alertUntil: 0,
  mic: { stop: null, db: NaN },
  tab: 'inicio',
};
const sim = createSimulator({ seed: Date.now() % 100000, scenario: app.scenario });

function persist() {
  try {
    const { config, face, profile, events, scenario } = app;
    localStorage.setItem(STORE, JSON.stringify({ config, face, profile, events, scenario }));
  } catch {
    /* sin almacenamiento: la demo sigue funcionando en memoria */
  }
}

// ---------- Avisos ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4000);
}

function handleEvent(ev) {
  if (ev.escalated) {
    const place = ev.metric === 'noise' && app.mic.stop ? 'Micrófono' : SCENARIOS[app.scenario].label;
    app.events = addEvent(app.events, { at: ev.at, metric: ev.metric, level: ev.to, value: ev.value, place });
    persist();
    if (app.tab === 'historial') renderHistory();
  }
  if (!ev.notify) return;
  const copy = alertCopy(ev.metric, ev.to);
  const modes = app.config.modes;
  if (modes.vibrate && navigator.vibrate) navigator.vibrate(ev.to === 'alert' ? [300, 150, 300, 150, 300] : [150]);
  $('#live').textContent = `${copy.title}. ${copy.suggestion}`;
  if (ev.to === 'alert') {
    if (modes.color || modes.pictogram) {
      app.alert = { metric: ev.metric, level: 'alert', title: copy.title, tint: modes.color, pictogram: modes.pictogram };
      app.alertUntil = ev.at + 8000;
    }
    $('#alert-text').textContent = `${copy.title}. ${copy.suggestion}`;
    $('#alert-box').hidden = false;
    if (modes.supportPerson && app.profile.supportName.trim()) toast(`Aviso enviado a ${app.profile.supportName.trim()} (simulado).`);
  } else {
    toast(`${copy.title}. ${copy.suggestion}`);
  }
}

function closeAlert() {
  app.alert = null;
  $('#alert-box').hidden = true;
}

// ---------- Render en vivo ----------
const LEVEL_STYLE = { ok: 'bg-ok-bg text-ok', pre: 'bg-pre-bg text-pre', alert: 'bg-alert-bg text-alert' };
const CARD_TEXT = { ok: 'Tranquilo', pre: 'Subiendo', alert: 'Pasó tu umbral' };

function buildCards() {
  for (const card of $$('#metric-cards [data-metric]')) {
    const m = METRICS[card.dataset.metric];
    card.innerHTML = `
      <div class="flex items-center gap-2"><span class="text-primary">${iconSVG(m.id)}</span><h3 class="font-bold">${m.label}</h3>
        <span class="ml-auto rounded-full px-3 py-1 text-xs font-bold" data-role="badge"></span></div>
      <p class="mt-3"><span class="text-4xl font-bold" data-role="value">--</span> <span class="text-muted">${m.unit}</span></p>
      <svg class="mt-2 h-8 w-full text-primary" viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true"><polyline data-role="spark" fill="none" stroke="currentColor" stroke-width="2" points=""/></svg>
      <p class="mt-2 text-sm text-muted" data-role="foot"></p>`;
  }
}

function sparkPoints(values, id) {
  const [lo, hi] = METRICS[id].range;
  return values
    .map((v, i) => `${((i / (SPARK - 1)) * 120).toFixed(1)},${(30 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 28).toFixed(1)}`)
    .join(' ');
}

function renderLive() {
  const levels = levelsOf(app.state);
  const thresholds = thresholdsOf(app.config);
  $('#app-watch').innerHTML = watchSVG({ readings: app.readings, levels, face: app.face, thresholds, alert: app.alert });
  if (app.tab === 'reloj') $('#face-preview').innerHTML = watchSVG({ readings: app.readings, levels, face: app.face, thresholds });
  for (const card of $$('#metric-cards [data-metric]')) {
    const id = card.dataset.metric;
    const mc = app.config.metrics[id];
    const lvl = mc.enabled ? levels[id] : 'ok';
    card.querySelector('[data-role="value"]').textContent = formatValue(id, app.readings[id]);
    const badge = card.querySelector('[data-role="badge"]');
    badge.textContent = mc.enabled ? CARD_TEXT[lvl] : 'Apagado';
    badge.className = `ml-auto rounded-full px-3 py-1 text-xs font-bold ${mc.enabled ? LEVEL_STYLE[lvl] : 'bg-surface-2 text-muted'}`;
    card.querySelector('[data-role="spark"]').setAttribute('points', sparkPoints(app.spark[id], id));
    card.querySelector('[data-role="foot"]').textContent = mc.enabled
      ? `${METRICS[id].kind === 'max' ? 'Tu umbral' : 'Aviso si baja de'}: ${formatValue(id, mc.threshold)} ${METRICS[id].unit}`
      : 'Aviso apagado';
  }
  const overall = overallLevel(app.state);
  const pill = $('#status-pill');
  pill.textContent = { ok: 'Tranquilo', pre: 'Subiendo', alert: 'Aviso' }[overall];
  pill.className = `ml-1 truncate whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold sm:text-sm ${LEVEL_STYLE[overall]}`;
}

function tick() {
  const now = Date.now();
  const r = sim.next(TICK_MS);
  if (app.mic.stop && Number.isFinite(app.mic.db)) r.noise = Math.round(app.mic.db * 10) / 10;
  app.readings = r;
  for (const id of METRIC_IDS) {
    app.spark[id].push(r[id]);
    if (app.spark[id].length > SPARK) app.spark[id].shift();
  }
  const res = step(app.state, r, app.config, now);
  app.state = res.state;
  res.events.forEach(handleEvent);
  if (app.alert && now > app.alertUntil) app.alert = null;
  renderLive();
}

// ---------- Formularios ----------
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

function syncOutputs() {
  for (const id of METRIC_IDS) {
    const t = app.config.metrics[id].threshold;
    $(`#out-${id}`).textContent = `${formatValue(id, t)} ${METRICS[id].unit}`;
    $(`#ref-${id}`).textContent = referenceFor(id, t);
  }
  $('#out-sustain').textContent = `${app.config.sustainSec} s`;
  $('#out-cooldown').textContent = app.config.cooldownMin === 0 ? 'Sin espera' : `${app.config.cooldownMin} min`;
  $('#out-mic').textContent = `+${app.profile.micOffset} dB`;
}

function syncForms() {
  for (const el of $$('[data-cfg]')) {
    const v = getPath(app.config, el.dataset.cfg);
    if (el.type === 'checkbox') el.checked = v;
    else el.value = v;
  }
  for (const el of $$('[data-profile]')) el.value = app.profile[el.dataset.profile];
  const f = app.face;
  for (const el of $$('[data-face]')) {
    const key = el.dataset.face;
    if (key === 'primary' || key === 'style') el.checked = el.value === f[key];
    else if (key === 'complications') {
      el.checked = f.complications.includes(el.value);
      el.disabled = el.value === f.primary;
    } else el.checked = f[key];
  }
  syncOutputs();
}

function onInput(e) {
  const el = e.target;
  if (el.dataset.cfg) {
    setPath(app.config, el.dataset.cfg, el.type === 'checkbox' ? el.checked : Number(el.value));
    app.config = normalizeConfig(app.config);
    syncOutputs();
  } else if (el.dataset.profile) {
    app.profile[el.dataset.profile] = el.type === 'range' ? Number(el.value) : el.value;
    syncOutputs();
  } else if (el.dataset.face) {
    const key = el.dataset.face;
    const f = { ...app.face };
    if (key === 'primary') {
      // La medida principal anterior ocupa el lugar de la nueva entre los datos chicos.
      f.complications = f.complications.map((c) => (c === el.value ? f.primary : c));
      f.primary = el.value;
    } else if (key === 'style') f[key] = el.value;
    else if (key === 'complications') {
      f.complications = $$('[data-face="complications"]:checked').map((c) => c.value);
      if (f.complications.length > 3) {
        el.checked = false;
        toast('Elegí hasta 3 datos chicos.');
        return;
      }
    } else f[key] = el.checked;
    app.face = normalizeFace(f);
    syncForms();
  } else return;
  persist();
  renderLive();
}

// ---------- Historial ----------
function renderHistory() {
  const sum = summarize(app.events);
  $('#history-summary').innerHTML = METRIC_IDS.map(
    (id) => `<div class="card p-4"><p class="flex items-center gap-2 font-bold"><span class="text-primary">${iconSVG(id, 'size-5')}</span>${METRICS[id].label}</p>
      <p class="mt-2 text-2xl font-bold">${sum[id].alert}</p><p class="text-sm text-muted">avisos · ${sum[id].pre} pre-avisos</p></div>`,
  ).join('');
  const fmtTime = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  $('#history-list').innerHTML = app.events.length
    ? app.events
        .slice(0, 50)
        .map((ev) => {
          const m = METRICS[ev.metric];
          const cls = ev.level === 'alert' ? LEVEL_STYLE.alert : LEVEL_STYLE.pre;
          return `<li class="flex flex-wrap items-center gap-3 p-4"><span class="rounded-full px-3 py-1 text-xs font-bold ${cls}">${ev.level === 'alert' ? 'Aviso' : 'Pre-aviso'}</span>
            <span class="font-bold">${m.label} ${formatValue(ev.metric, ev.value)} ${m.unit}</span><span class="text-muted">${ev.place}</span>
            <time class="ml-auto text-sm text-muted" datetime="${new Date(ev.at).toISOString()}">${fmtTime.format(ev.at)}</time></li>`;
        })
        .join('')
    : '<li class="p-6 text-muted">Todavía no hay avisos. Probá el lugar "Recital" en Inicio.</li>';
}

// ---------- Pestañas ----------
const tabs = $$('[role="tab"]');
function selectTab(name, focus = false) {
  app.tab = name;
  for (const t of tabs) {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    t.classList.toggle('text-muted', !on);
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    if (on && focus) t.focus();
  }
  if (name === 'historial') renderHistory();
  history.replaceState(null, '', name === 'inicio' ? location.pathname : `#${name}`);
  renderLive();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t.dataset.tab));
  t.addEventListener('keydown', (e) => {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(tabs[(next + tabs.length) % tabs.length].dataset.tab, true);
  });
});

// ---------- Momento de calma ----------
let calmTimer;
function openCalm() {
  const dlg = $('#calm-dialog');
  let left = 60;
  const word = $('#breath-word');
  const count = $('#breath-count');
  word.textContent = 'Inhalá';
  count.textContent = '60 segundos';
  clearInterval(calmTimer);
  calmTimer = setInterval(() => {
    left -= 1;
    if (left % 4 === 0) word.textContent = word.textContent === 'Inhalá' ? 'Exhalá' : 'Inhalá';
    count.textContent = `${left} segundos`;
    if (left <= 0) {
      clearInterval(calmTimer);
      word.textContent = 'Listo';
    }
  }, 1000);
  dlg.showModal();
  dlg.addEventListener('close', () => clearInterval(calmTimer), { once: true });
  closeAlert();
}

// ---------- Micrófono ----------
async function toggleMic() {
  const btn = $('#mic-toggle');
  if (app.mic.stop) {
    app.mic.stop();
    app.mic.stop = null;
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = 'Medir ruido con mi micrófono';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const x of buf) sum += x * x;
      app.mic.db = smooth(app.mic.db, rmsToDb(Math.sqrt(sum / buf.length), app.profile.micOffset), 0.3);
    }, 100);
    app.mic.stop = () => {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      app.mic.db = NaN;
    };
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = 'Micrófono activado · tocá para apagar';
  } catch {
    toast('No pudimos usar el micrófono. Seguimos con datos simulados.');
  }
}

// ---------- Inicio ----------
buildCards();
syncForms();
$$('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scenario === app.scenario)));
document.addEventListener('input', onInput);
document.addEventListener('change', onInput);
document.addEventListener('click', (e) => {
  const sc = e.target.closest('[data-scenario]');
  if (sc) {
    app.scenario = sc.dataset.scenario;
    sim.setScenario(app.scenario);
    $$('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b === sc)));
    persist();
  }
  if (e.target.closest('[data-open-calm]')) openCalm();
});
$('#alert-ok').addEventListener('click', closeAlert);
$('#mic-toggle').addEventListener('click', toggleMic);
$('#csv-download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([eventsToCSV(app.events)], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'umbral-historial.csv' });
  a.click();
  URL.revokeObjectURL(url);
});
$('#history-clear').addEventListener('click', () => {
  app.events = [];
  persist();
  renderHistory();
});
$('#reset-all').addEventListener('click', () => {
  if (!confirm('¿Restablecer umbrales, esfera e historial?')) return;
  app.config = defaultConfig();
  app.face = normalizeFace();
  app.profile = { supportName: '', micOffset: 94 };
  app.events = [];
  persist();
  syncForms();
  toast('Listo, todo volvió a los valores iniciales.');
});

function routeHash() {
  const hash = location.hash.slice(1);
  if (hash === 'calma') openCalm();
  else if (tabs.some((t) => t.dataset.tab === hash)) selectTab(hash);
}
window.addEventListener('hashchange', routeHash);
routeHash();
tick();
setInterval(tick, TICK_MS);
