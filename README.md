# Umbral

**Su reloj sabe cuándo es demasiado.** Umbral es una app para smartwatch pensada para chicos y adolescentes con autismo y sus familias. Mide el ruido, la luz, el pulso y el oxígeno, y le avisa a tiempo a la persona con autismo, antes de una sobrecarga sensorial, con vibración, color y pictogramas. Menos crisis y ataques de pánico, más independencia: un alivio para los chicos y para sus padres.

Proyecto presentado en la **Hackathon AutonomIA 2026** (Ciudad de Buenos Aires, Universidad Maimónides).

- `/`: sitio promocional.
- `/app/`: demo funcional e instalable (PWA). Incluye reloj en vivo, 6 lugares simulados, medición real de ruido con el micrófono del teléfono, umbrales configurables, pantalla personalizable, rutinas paso a paso, pictogramas con acceso directo, momento de calma, historial de 7 días, informe semanal en PDF y exportación a CSV.

Umbral funciona con smartwatches existentes: relojes con Wear OS como Samsung Galaxy Watch (compatibilidad completa) u otros, como Xiaomi Watch 2, según sus sensores. Sin reloj, mide el ruido con el micrófono del teléfono. En la demo, pulso, oxígeno y luz son simulados.

## Correr local

```bash
npm install
```

```bash
npm run dev
```

Abre en http://localhost:4173. El micrófono funciona en `localhost` y en HTTPS.

## Tests

```bash
npm test
```

91 tests en `tests/`, sin dependencias, en menos de 2 segundos. Corren solos antes de cada commit (`.githooks/pre-commit`, se activa con `npm install`). Cubren:

- Motor de umbrales: pre-aviso, histéresis, tiempo sostenido, cooldown, métricas apagadas y configuración corrupta.
- Simulador: determinismo por semilla, límites de cada sensor y escenarios realistas.
- Pantallas del reloj (cuadradas y redondas), rutinas, pictogramas e informe PDF.
- Accesibilidad del HTML: idioma, un `h1`, salto al contenido, etiquetas en todos los controles, nombres accesibles y zoom permitido.
- Contraste WCAG AA de toda la paleta y de las pantallas del reloj.
- PWA: manifest instalable, íconos con el tamaño declarado y service worker que precachea todo.
- Los precios de la landing coinciden con `assets/js/model.js`.

## Estructura

```
index.html              Sitio (HTML estático + Tailwind)
app/index.html          App demo
src/styles.css          Fuente de Tailwind v4 (tokens de color)
assets/css/styles.css   CSS compilado (generado, no editar)
assets/js/engine.js     Motor de umbrales (lógica pura)
assets/js/simulator.js  Sensores simulados
assets/js/watchface.js  Pantalla del reloj en SVG (cuadrada o redonda)
assets/js/pictos.js     Biblioteca de pictogramas
assets/js/routines.js   Rutinas paso a paso (versión provisoria)
assets/js/report.js     Informe semanal en PDF, sin dependencias
assets/js/model.js      Precios y modelo de negocio
assets/js/history.js    Historial y CSV
assets/js/app.js        Lógica de la app
assets/js/landing.js    Reloj animado del inicio y selector de precios
assets/js/ui.js         Tamaño de texto, perfil e instalación
sw.js                   Service worker (funciona sin conexión)
scripts/                Servidor local, íconos y pre-render de pantallas
```

## Editar

- **Estilos:** editá clases Tailwind en el HTML o `src/styles.css`, después `npm run build:css`.
- **Pantallas de ejemplo del sitio:** se pre-renderizan en el HTML. Si cambiás `watchface.js` o `scripts/render-faces.mjs`, corré `npm run build:faces`.
- **Precios:** cambiá `ASSUMPTIONS` en `assets/js/model.js` y actualizá los `data-model` de `index.html`. El test avisa si no coinciden.
- **Publicar cambios en la app instalada:** subí `VERSION` en `sw.js`.

## Publicar en Vercel

Importá el repo en Vercel con **Add New Project** y dejá todo por defecto. `vercel.json` ya define el build (`npm run build`) y la salida (raíz del repo).

## Equipo

Franco Nahuel Preiss, María Luz Sueldo, Brisa Aimee Rodriguez, Federico Julián Pérez Trench y Axel Julián Dumas Cutuli.

## Aviso

Umbral no es un dispositivo médico. Samsung, Galaxy Watch, Xiaomi y Wear OS son marcas de sus dueños. El combo con reloj es un escenario de negocio presentado en la hackathon: Umbral no tiene un acuerdo comercial con Samsung.
