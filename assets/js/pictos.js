// Biblioteca de pictogramas (comunicación aumentativa). Dibujo propio en trazo 24x24,
// un concepto por pictograma y texto en primera persona (pautas del Manual de Accesibilidad BA).
// `short`: etiqueta corta para la grilla del reloj.
export const PICTOS = {
  pausa: { label: 'Necesito una pausa', short: 'Pausa', paths: ['M9 6v12', 'M15 6v12'] },
  ayuda: { label: 'Necesito ayuda', short: 'Ayuda', paths: ['M8 13V6.5a1.5 1.5 0 0 1 3 0V12', 'M11 11V4.5a1.5 1.5 0 0 1 3 0V11', 'M14 11V6.5a1.5 1.5 0 0 1 3 0v6.5c0 4-2.5 8-7 8-3 0-5-2-5-5v-3a1.5 1.5 0 0 1 3 0'] },
  si: { label: 'Sí', short: 'Sí', paths: ['M5 12.5l4.5 4.5L19 7.5'] },
  no: { label: 'No', short: 'No', paths: ['M6 6l12 12', 'M18 6L6 18'] },
  agua: { label: 'Quiero agua', short: 'Agua', paths: ['M7 4h10l-1.6 16H8.6z', 'M7.7 10h8.6'] },
  comer: { label: 'Tengo hambre', short: 'Comer', paths: ['M13 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11z', 'M4 4v5a2 2 0 0 0 4 0V4', 'M6 11v9', 'M21 4c-2 1-2.5 3.5-2.5 6H21v10'] },
  bano: { label: 'Necesito ir al baño', short: 'Baño', paths: ['M7 3h5v8H7z', 'M5 11h13a5 5 0 0 1-5 5H9.5', 'M10 16l-1 5h6l-1-5'] },
  auriculares: { label: 'Quiero mis auriculares', short: 'Auriculares', paths: ['M4 15v-3a8 8 0 0 1 16 0v3', 'M4 14h3v6H4z', 'M17 14h3v6h-3z'] },
  casa: { label: 'Quiero ir a casa', short: 'Casa', paths: ['M3 11.5L12 4l9 7.5', 'M5.5 10v10h13V10', 'M10 20v-5h4v5'] },
  dolor: { label: 'Me duele algo', short: 'Dolor', paths: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 7.5v6', 'M12 16.5v.5'] },
  tocar: { label: 'No me toques', short: 'No tocar', paths: ['M8 12V6.5a1.5 1.5 0 0 1 3 0V11', 'M11 10V5a1.5 1.5 0 0 1 3 0v5', 'M14 10V7a1.5 1.5 0 0 1 3 0v6c0 4-2 7-6 7-3 0-5-2.5-5-5.5V13', 'M3 3l18 18'] },
  bien: { label: 'Estoy bien', short: 'Bien', paths: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M9 10h.01', 'M15 10h.01', 'M8 14.5c1.6 2 6.4 2 8 0'] },
};
export const PICTO_IDS = Object.keys(PICTOS);
export const MAX_WATCH_PICTOS = 4;

export function defaultPictos() {
  return { items: ['pausa', 'ayuda', 'si', 'no'], shortcut: 'pausa' };
}

// Hasta 4 pictogramas válidos y sin repetir. El acceso directo tiene que ser uno de ellos.
export function normalizePictos(input) {
  const base = defaultPictos();
  const p = input && typeof input === 'object' ? input : {};
  const items = Array.isArray(p.items) ? [...new Set(p.items)].filter((id) => PICTOS[id]).slice(0, MAX_WATCH_PICTOS) : base.items;
  const shortcut = items.includes(p.shortcut) ? p.shortcut : items[0] ?? null;
  return { items, shortcut };
}
