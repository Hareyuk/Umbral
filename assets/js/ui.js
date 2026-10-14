// Preferencias visuales (tema, modo calma, tamaño de texto) e instalación de la PWA.
// Compartido por la landing y la app. El tema inicial lo aplica un script inline en <head> para evitar parpadeo.
const KEY = 'umbral:prefs';
const root = document.documentElement;

function load() {
  try {
    return { theme: null, calm: false, scale: 1, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { theme: null, calm: false, scale: 1 };
  }
}

function save(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* modo privado: las preferencias duran solo esta visita */
  }
}

function apply(p) {
  root.dataset.calm = p.calm ? 'on' : 'off';
  root.style.setProperty('--text-scale', p.scale);
  document.querySelectorAll('[data-pref="calm"]').forEach((b) => b.setAttribute('aria-pressed', String(p.calm)));
  document.querySelectorAll('[data-pref="theme"]').forEach((b) => b.setAttribute('aria-pressed', String(root.dataset.theme === 'dark')));
}

export function initUI() {
  const prefs = load();
  apply(prefs);
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-pref], [data-install]');
    if (!btn) return;
    if (btn.dataset.install !== undefined) return install();
    const pref = btn.dataset.pref;
    if (pref === 'calm') prefs.calm = !prefs.calm;
    if (pref === 'theme') {
      prefs.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = prefs.theme;
    }
    if (pref === 'bigger') prefs.scale = Math.min(1.4, Math.round((prefs.scale + 0.1) * 10) / 10);
    if (pref === 'smaller') prefs.scale = Math.max(0.9, Math.round((prefs.scale - 0.1) * 10) / 10);
    save(prefs);
    apply(prefs);
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) document.querySelectorAll('[data-install]').forEach((b) => (b.hidden = true));
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

let deferredPrompt = null;
async function install() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null;
    return;
  }
  // iPhone o navegador sin prompt: mostramos los pasos manuales.
  document.getElementById('install-help')?.showModal();
}
