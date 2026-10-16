# Umbral: registro del chat de desarrollo

Proyecto para la **Hackathon AutonomIA 2026** (Gobierno de la Ciudad de Buenos Aires, Universidad Maimónides).
Conversación entre Axel y Claude (Claude Code) durante el armado del sitio, del 13 al 15 de octubre de 2026.

---

## 1. Pedido inicial

> **Axel:** Creame una app móvil a través de instalar app de sitio web, ya que planearemos subir esto a Vercel subiendo este repositorio a Github.
>
> Estamos participando para una hackaton de discapacidad de Buenos Aires, así que trabajaremos en la carpeta AppSmartWatchDiscapacidad, te cargué el Claude.md que te indica cómo debe ser tu flujo de trabajo y de procesamiento junto a una carpeta "hackaton" que tiene los archivos y datos de la competencia para sacar lo mejor y más marketeable posible.
>
> "Lo mejor va a ser que trabajemos con el autismo y demás neurodivergencias con esta app que se vincula a una especie de smartwatch donde indique datos como el ritmo cardíaco, el oxígeno en sangre, los decibeles y la luminosidad. Todo esto puede ser personalizable y te puede avisar cuando llega a 1 decibel marcado por ejemplo. La pantalla principal del smartwatch es totalmente personalizable dependiendo de lo que más necesite la persona, si le importa más los decibeles o su pulso cardíaco"
>
> Sería como un sitio web demo que hable de cómo un reloj smartwatch ayuda a los autistas y otros tipos de discapacidades como sordera, que sea amplio pero nos enfocamos en autistas, y ofrezca funciones que ayuden mucho a estas personas a través de un smartwatch (por ejemplo quizás relojes Samsung personalizados ya que tienen buena precisión de medidores). No haremos nada del reloj, solo sitio web como si fuera promocional real.

**Claude** leyó los materiales de la hackathon:

- **Agenda:** hack día 1 el 16/10 (validar y prototipar), entrega de la demo el 17/10 a las 10:30 y pitch de 5 minutos. El pitch tiene que cubrir problema, usuario, solución, validación, modelo de negocio con números y equipo.
- **Datos e investigación:** OMS (1 de cada 127 personas es autista), INDEC (10,2% de la población con alguna dificultad; 1 de cada 4 hogares), OMS/UNICEF (2 de cada 3 personas pagan sus productos de apoyo de su bolsillo) y el estudio de Pittsburgh que usa dispositivos comerciales.
- **Bibliografía complementaria:** casos argentinos como Háblalo, ISay y Procer.
- **Manual de Accesibilidad Universal BA:** modelo social de la discapacidad, lenguaje claro, pictogramas, historias sociales, hora silenciosa, espacios de regulación sensorial (Ley 6.798) y pautas WCAG.

## 2. Cambios de dirección durante el armado

> **Axel:** Maybe it's the best if we work with Tailwind and most minimal JS possible, because it will be a static website.

**Claude:** Usa Tailwind v4 compilado a un CSS estático, sin Tailwind corriendo en el navegador y funcionando offline. El JS queda solo para la demo en vivo.

> **Axel:** Si aún no estás diseñando, podés armar un mini prototipo típico estilo Apple que promocione un reloj smartwatch para estas necesidades especiales con paleta de color azul y amarillo, o naranja, como lo más vivo y alegre. (Me refiero a diseño web.)

**Claude:** Arma la landing como página de producto estilo Apple con paleta azul, amarillo y naranja. Como el público es autista, suma un **Modo calma** que apaga las animaciones y baja los colores, y una esfera de reloj "Vivo" azul y amarilla.

## 3. Resultado: Umbral

**Concepto:** "Umbral. Tu reloj sabe cuándo es demasiado." Un smartwatch que mide ruido, luz, pulso y oxígeno y avisa con vibración, color y pictogramas antes de la sobrecarga sensorial. Sin sonidos ni destellos.

### Landing (`/`)
- Arriba, un reloj que se mueve en vivo con lugares simulados (Casa, Colectivo, Supermercado, Recital).
- El problema, con datos citados. Frase central del modelo social: "La barrera no está en la persona. Está en el entorno."
- Cómo funciona en 4 pasos, tarjetas de funciones, 4 esferas de ejemplo y para quién es: autismo como foco, más TDAH, personas sordas, discapacidad intelectual, familias y escuelas.
- Principios, indicadores del piloto, modelo de negocio con números, preguntas frecuentes y fuentes.

### App instalable (`/app/`)
- **Inicio:** reloj en vivo, 6 lugares simulados y medición de ruido con el micrófono real del teléfono. Solo calcula decibeles; el audio no se graba.
- **Reloj:** qué medida va en grande, datos chicos, estilo (Vivo, Oscuro, Alto contraste, Suave) y modo solo colores.
- **Avisos:** umbrales con referencias cotidianas ("75 dB, parecido a una aspiradora"), pre-aviso, forma de avisar y persona de apoyo.
- **Historial:** exportable a CSV para el terapeuta.
- **Momento de calma:** respiración guiada de 60 segundos.

### Modelo de negocio (estimado)
| | Año 1 | Año 3 |
| --- | --- | --- |
| Suscripciones Plus (US$ 3/mes) | 1.500 | 12.000 |
| Escuelas (US$ 400/año) | 25 | 300 |
| Convenios con obras sociales | 0 | 2 |
| **Ingresos anuales** | **US$ 64.000** | **US$ 652.000** |

Hay 362.557 personas autistas estimadas en Argentina (Censo 2022 por la prevalencia de la OMS). En el año 3, las suscripciones llegan al 3,3% de ese total.

### Calidad
- 60 tests automáticos que corren antes de cada commit. Cubren la lógica de avisos, el simulador, la accesibilidad del HTML, el contraste WCAG AA de toda la paleta, que la app sea instalable y que los números de la landing coincidan con el modelo.
- Probado en celular y en escritorio, sin errores.

### Pendientes para el pitch
1. Agregar el **equipo** (nombres y roles).
2. Completar la **validación** con lo que aprendan del usuario el 16/10.
3. Las cifras de negocio son supuestos; se editan en `assets/js/model.js`.

## 4. Subida a GitHub

> **Axel:** Se bugeó, lo intento subir con GitHub Desktop y da error porque no existe el repositorio en GitHub, creo que hice mal los comandos.

**Claude:** El repo local apuntaba a `github.com/Hareyuk/umbral`, que todavía no existía. Sacó esa conexión rota sin tocar el código e indicó cómo publicarlo desde GitHub Desktop: *File → Add local repository* y después *Publish repository*. Eso crea el repo y sube todo en un paso. Después se conecta en Vercel con *Add New Project*.

---

*Más detalle técnico en el `README.md` del repositorio.*
