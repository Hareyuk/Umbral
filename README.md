# Umbral

Sitio promocional y app instalable (PWA) de **Umbral**, un concepto de smartwatch sensorial para personas autistas y neurodivergentes. Mide ruido, luz, pulso y oxígeno y avisa, con vibración, color y pictogramas, antes de la sobrecarga sensorial.

Proyecto para la **Hackathon AutonomIA 2026** (Ciudad de Buenos Aires, Universidad Maimónides).

- `/` landing estilo página de producto (azul, amarillo y naranja, con Modo calma).
- `/app/` demo funcional: reloj en vivo, 6 lugares simulados, micrófono real para medir decibeles, umbrales configurables, esfera personalizable, momento de calma e historial exportable a CSV.

No hay hardware: pulso, oxígeno y luz son simulados. El ruido puede medirse con el micrófono del teléfono (solo se calcula el nivel, el audio no se guarda).

## Correr local

```bash
npm install
npm run dev
```

Abre en http://localhost:4173. El micrófono funciona en `localhost` y en HTTPS (Vercel).

## Tests

```bash
npm test
```

60 tests en `tests/`, sin dependencias, en menos de 2 segundos. Corren solos antes de cada commit (`.githooks/pre-commit`, se activa con `npm install`). Cubren:

- Motor de umbrales: pre-aviso, histéresis, tiempo sostenido, cooldown, métricas apagadas, config corrupta.
- Simulador: determinismo por semilla, límites de cada sensor, escenarios realistas.
- Accesibilidad del HTML: idioma, un `h1`, salto al contenido, etiquetas en todos los controles, nombres accesibles, zoom permitido.
- Contraste WCAG AA de toda la paleta (claro, oscuro y esferas del reloj).
- PWA: manifest instalable, íconos con el tamaño declarado, service worker que precachea todo.
- Las cifras del modelo de negocio en la landing coinciden con `assets/js/model.js`.

## Estructura

```
index.html              Landing (HTML estático + Tailwind)
app/index.html          App demo
src/styles.css          Fuente de Tailwind v4 (tokens de color y modo calma)
assets/css/styles.css   CSS compilado (generado, no editar)
assets/js/engine.js     Motor de umbrales (lógica pura)
assets/js/simulator.js  Sensores simulados
assets/js/watchface.js  Esfera del reloj en SVG
assets/js/model.js      Modelo de negocio estimado
assets/js/history.js    Historial y CSV
assets/js/app.js        Lógica de la app
assets/js/landing.js    Reloj animado del hero
assets/js/ui.js         Tema, Modo calma, tamaño de texto, instalación
sw.js                   Service worker (offline)
scripts/                Servidor local, íconos y pre-render de esferas
```

## Editar

- **Estilos:** editá clases Tailwind en el HTML o `src/styles.css`, después `npm run build:css`.
- **Esferas de la landing:** se pre-renderizan en el HTML. Si cambiás `watchface.js` o `scripts/render-faces.mjs`, corré `npm run build:faces`.
- **Números del negocio:** cambiá `ASSUMPTIONS` en `assets/js/model.js` y actualizá los `data-model` de `index.html`. El test avisa si no coinciden.
- **Publicar cambios en la PWA instalada:** subí `VERSION` en `sw.js`.

## Subir a GitHub y Vercel

```bash
git remote add origin https://github.com/USUARIO/umbral.git
git push -u origin main
```

En Vercel: **Add New Project**, importá el repo y dejá todo por defecto. `vercel.json` ya define el build (`npm run build`) y la salida (raíz del repo).

## Guion del pitch (5 minutos)

| Punto del jurado | Dónde está en el sitio |
| --- | --- |
| 01 Problema | Sección "Por qué existe Umbral" con datos de OMS, Leekam, INDEC y OMS/UNICEF |
| 02 Usuario | "Para quién": foco en autismo, más TDAH, personas sordas, discapacidad intelectual, familias y escuelas |
| 03 Solución | Hero en vivo + "Cómo funciona" + demo en `/app/` (probar el lugar Recital) |
| 04 Validación | "Lo que vamos a medir": indicadores del piloto. Completar con lo que aprendan el día 1 |
| 05 Modelo de negocio | "Modelo de negocio": freemium, escuelas, obras sociales, escenario a 1 y 3 años |
| 06 Equipo | Falta: agregar nombres y roles del equipo |

## Aviso

Umbral no es un dispositivo médico. Galaxy Watch y Wear OS son marcas de sus dueños; Umbral es un proyecto independiente, sin afiliación con Samsung ni Google.
