// Tamaño de texto, perfil e instalación de la PWA. Compartido por la landing y la app.
// La escala inicial la aplica un script inline en <head> para evitar parpadeo.
const KEY = 'umbral:prefs';
const root = document.documentElement;

function load() {
  try {
    return { scale: 1, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { scale: 1 };
  }
}

function save(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* modo privado: las preferencias duran solo esta visita */
  }
}

export function initUI() {
  const prefs = load();
  root.style.setProperty('--text-scale', prefs.scale);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pref], [data-install], [data-open-account]');
    if (!btn) return;
    if (btn.dataset.install !== undefined) return install();
    if (btn.dataset.openAccount !== undefined) return document.getElementById('account')?.showModal();
    const step = { bigger: 0.1, smaller: -0.1 }[btn.dataset.pref] ?? 0;
    prefs.scale = Math.min(1.4, Math.max(0.9, Math.round((prefs.scale + step) * 10) / 10));
    root.style.setProperty('--text-scale', prefs.scale);
    save(prefs);
  });

  // Perfil (demo): no guarda ni envía datos; al registrarse lleva a los planes.
  const account = document.getElementById('account');
  account?.addEventListener('close', () => {
    if (account.returnValue === 'planes') document.getElementById('suscripciones')?.scrollIntoView();
    account.querySelector('form')?.reset();
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
