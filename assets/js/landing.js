// Landing: solo anima el reloj del hero. Todo lo demás es HTML estático.
import { defaultConfig, createState, step, levelsOf, thresholdsOf, alertCopy } from './engine.js';
import { createSimulator } from './simulator.js';
import { watchSVG } from './watchface.js';
import { initUI } from './ui.js';

initUI();

// Precios de Plus: mensual o anual. Sin JS se ve el mensual.
const billingButtons = document.querySelectorAll('[data-billing]');
billingButtons.forEach((btn) =>
  btn.addEventListener('click', () => {
    billingButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.querySelectorAll('[data-billing-show]').forEach((el) => (el.hidden = el.dataset.billingShow !== btn.dataset.billing));
  }),
);

const host = document.getElementById('hero-watch');
const status = document.getElementById('hero-status');
const chips = document.querySelectorAll('[data-hero-scenario]');

if (host) {
  const config = { ...defaultConfig(), sustainSec: 2, cooldownMin: 0.25 };
  const face = { primary: 'noise', complications: ['heart', 'light', 'spo2'], style: 'vivo' };
  const sim = createSimulator({ seed: 11, scenario: 'colectivo' });
  let state = createState();
  let readings = sim.next(0);
  let alert = null;
  let alertUntil = 0;

  const tick = () => {
    if (document.hidden) return;
    const now = Date.now();
    readings = sim.next(500);
    const res = step(state, readings, config, now);
    state = res.state;
    for (const ev of res.events) {
      if (!ev.notify) continue;
      const copy = alertCopy(ev.metric, ev.to);
      status.textContent = `${copy.title}. ${copy.suggestion}`;
      if (ev.to === 'alert') {
        alert = { metric: ev.metric, level: 'alert', title: copy.title };
        alertUntil = now + 4000;
      }
    }
    if (alert && now > alertUntil) alert = null;
    host.innerHTML = watchSVG({ readings, levels: levelsOf(state), face, thresholds: thresholdsOf(config), alert });
  };
  setInterval(tick, 500);

  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      sim.setScenario(chip.dataset.heroScenario);
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      status.textContent = '';
    }),
  );
}
