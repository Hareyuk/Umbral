# Umbral

Sitio promocional y app instalable (PWA) de **Umbral**, un concepto de reloj inteligente propio pensado para personas con autismo. Mide ruido, luz, pulso y oxígeno y avisa, con vibración, color y pictogramas, antes de la sobrecarga sensorial.

Proyecto para la **Hackathon AutonomIA 2026** (Ciudad de Buenos Aires, Universidad Maimónides).

- `/` landing estilo página de producto (azul oscuro con amarillo y naranja).
- `/app/` demo funcional: reloj en vivo, 6 lugares simulados, micrófono real para medir decibeles, umbrales configurables, esfera personalizable, momento de calma e historial exportable a CSV.

El reloj Umbral es un diseño propio que se entrega sin costo por obra social, autorización médica o programas de gobierno; la suscripción sostiene el mantenimiento. En la demo no hay hardware: pulso, oxígeno y luz son simulados. El ruido puede medirse con el micrófono del teléfono (solo se calcula el nivel, el audio no se guarda).

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

63 tests en `tests/`, sin dependencias, en menos de 2 segundos. Corren solos antes de cada commit (`.githooks/pre-commit`, se activa con `npm install`). Cubren:

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
src/styles.css          Fuente de Tailwind v4 (tokens de color)
assets/css/styles.css   CSS compilado (generado, no editar)
assets/js/engine.js     Motor de umbrales (lógica pura)
assets/js/simulator.js  Sensores simulados
assets/js/watchface.js  Esfera del reloj en SVG
assets/js/model.js      Modelo de negocio estimado
assets/js/history.js    Historial y CSV
assets/js/app.js        Lógica de la app
assets/js/landing.js    Reloj animado del hero
assets/js/ui.js         Tamaño de texto, perfil, instalación
sw.js                   Service worker (offline)
scripts/                Servidor local, íconos y pre-render de esferas
```

## Editar

- **Estilos:** editá clases Tailwind en el HTML o `src/styles.css`, después `npm run build:css`.
- **Esferas de la landing:** se pre-renderizan en el HTML. Si cambiás `watchface.js` o `scripts/render-faces.mjs`, corré `npm run build:faces`.
- **Precios y números del negocio:** cambiá `ASSUMPTIONS` en `assets/js/model.js` y actualizá los `data-model` de `index.html`. El test avisa si no coinciden. La tabla de ingresos a 1 y 3 años quedó solo para el pitch (`marketModel()`): año 1 US$ 92.500, año 3 US$ 850.000.
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
| 02 Usuario | "Para quién": personas con autismo, con versatilidad para otras discapacidades |
| 03 Solución | Hero en vivo + "Cómo funciona" + demo en `/app/` (probar el lugar Recital) |
| 04 Validación | "Lo que vamos a medir": indicadores del piloto. Completar con lo que aprendan el día 1 |
| 05 Modelo de negocio | "Suscripciones": reloj sin costo por obra social o gobierno, Básico gratis (7 días de historial), Plus US$ 5/mes, Escuelas US$ 100/año con el Gobierno de la Ciudad. Tabla a 1 y 3 años en `marketModel()` |
| 06 Equipo | Falta: agregar nombres y roles del equipo |

## Aviso

Umbral no es un dispositivo médico.
