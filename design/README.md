# PulseAW — propuesta de rediseño

Fecha: 2026-09-10. Estado: mockup propuesto, pendiente de feedback. No se ha implementado ni publicado el rediseño.

## Revisión
Repositorio clonado de https://github.com/gianw-develop/pulseaw-web en /Users/gianw/Documents/PulseAw. Revisadas la portada publicada https://www.pulseaw.com/ en navegador, su captura de escritorio y el código de app/page.tsx, app/layout.tsx y app/globals.css.

La marca vende entregables de marketing digital a pequeñas empresas y emprendedores, con catálogo de precio fijo y checkout de Stripe. Idioma actual: inglés. Conservar logo original public/logo.png, Inter, azul #2563EB, azul #1d4ed8, navy y blancos. Conservar 13 servicios actuales, precios $10–$200, enlaces Stripe y páginas legales.

Hallazgos: la portada no muestra entregables y dedica mucho espacio a texto centrado. Catálogo largo con tarjetas repetidas y aceptación legal repetida. El contador y los metadatos anuncian 10 servicios aunque hay 13. El texto “Built for the Stripe algorithm” es interno y no ayuda al comprador. La franja “Trusted by marketers at” requiere evidencia de esas relaciones; no se reutiliza en la propuesta. El formulario usa mailto, no un envío web; la navegación móvil queda oculta sin alternativa de menú en el código. La FAQ carece de aria-expanded en el botón. No se probaron pagos ni se enviaron formularios. No se realizó prueba responsive funcional ni auditoría de rendimiento en esta fase.

## Dirección visual
Mockup: pulseaw-home-mockup-v1.png. Una propuesta, según la petición del usuario. Generada con herramienta integrada ImageGen y logo original como referencia. El archivo original del logo permanece intacto y será el recurso de implementación: una imagen generada no garantiza identidad exacta a nivel de píxel.

Portada de dos columnas: texto y CTA a la izquierda, composición ilustrativa de entregables a la derecha; fondos claros con contraste navy en proceso. Catálogo con filtros, vista resumida de tres servicios reales y acceso al catálogo completo. No son trabajos de clientes; visuales etiquetados como ilustrativos. Se conserva el mensaje principal y se proponen ajustes de copy, sujetos a revisión. Las miniaturas y textos decorativos de la imagen no amplían el alcance comercial de los servicios.

Referencias de oferta y proceso: https://www.designjoy.co/ y https://www.manypixels.co/. Se consultó su contenido para claridad de oferta, exposición del trabajo y proceso; no se copiaron diseños. La oportunidad de PulseAW es mostrar entregables concretos con precios individuales y su propia identidad.

## Comportamiento previsto
- Browse services: desplazamiento al catálogo, 300 ms; inmediato con movimiento reducido.
- Filtros: selección activa azul y actualización de servicios de la categoría; teclado y toque equivalentes. All services muestra los 13.
- View service: abre detalle con alcance y precio reales; preservar aceptación legal previa al enlace Stripe. No presentar tarjetas ilustrativas como checkout real.
- Explore all 13 services: muestra catálogo completo.
- FAQ: acordeón accesible, aria-expanded, 180 ms; sin animación con movimiento reducido.
- Contacto: mantener email actual; cualquier sustitución del mailto requiere definir envío real.
- Móvil: logo original, menú accesible, titular y CTA antes de la ilustración, fichas en una columna y proceso apilado. Filtros deben envolver sin desbordamiento.
- Hover: bordes/sombra ligeros 150 ms, sin movimiento constante ni parallax necesario.

La imagen es una propuesta estática, no una vista previa funcional. En implementación, textos, precios, navegación y controles serán HTML; los fondos y entregables serán recursos separados. Corregir artefactos de generación y usar el logo fuente. Aún no hay aprobación para implementar.

## Prompt final

Use case: ui-mockup.
Create ONE polished high-fidelity desktop homepage redesign mockup for PulseAW, an existing US digital marketing agency selling fixed-price deliverables to small businesses. Portrait canvas approximately 1440x2300, entire crisp website design, no device bezel, no outside presentation labels.
Input image: original transparent PulseAW logo. Preserve this exact logo faithfully, including P pulse/speed symbol, dark navy Pulse and blue AW wordmark. Place it on white in header at generous readable size. Do not invent another logo.
Keep existing palette: primary #2563EB, deeper #1d4ed8, navy #0f172a, white #ffffff, pale #f0f7ff and slate neutral. No other accent hues. Modern Inter-like sans typography, strong editorial hierarchy, restrained fine rules, purposeful space, premium marketing studio rather than SaaS dashboard.
HEADER white: original logo left, Services / How it works / About / Contact middle, blue Browse services button right.
HERO pale blue-white: asymmetric two column composition, left about 47%, right 53%. Tiny eyebrow FIXED-PRICE DIGITAL MARKETING. Large beautifully typeset navy headline 'Marketing services,' then blue 'priced like products.' Supporting text 'Clear scope. Fixed prices. Marketing made simple.' Blue Browse services CTA and quieter How it works link. Small line 'Services from $10 · Secure checkout with Stripe'.
Right hero is a sophisticated tactile editorial still life of illustrative marketing deliverables, dimensional crisp white content planner sheets, bold blue social post artwork, small keyword report and a creative brief on a navy flat backing. Plausible soft studio shadows and layered 3D perspective but restrained, no neon, no robot, no generic graph or fake dashboard metrics. Label this visual 'ILLUSTRATIVE DELIVERABLES', not a real customer portfolio. Art direction distinctively marketing and content. Include a thin blue pulse line motif connecting this composition to the brand, without altering logo.
BELOW HERO a compact white horizontal strip with three clear facts: '13 services' / 'From $10' / 'Fixed prices'. No fake trust logos, client counts or ratings.
SERVICES white generous section with eyebrow THE SERVICE MENU, heading 'Your next move starts here.' Category tabs 'All services' active blue, 'Content', 'SEO', 'Ads', 'Strategy'. A curated preview, three refined product cards with small designed document previews at tops: 'Social Media Content Starter Pack' '$10' 'Editable ideas and captions for a fast content launch.'; 'Website SEO Quick Audit' '$75' 'Technical overview plus a ranked improvement checklist.'; 'Full Growth Roadmap' '$200' '90-day plan with priorities, channels, and next steps.' Each has View service arrow, not fake active payment controls. Under row link 'Explore all 13 services →'. These are previews of the existing 13-item catalog, do not imply only 3 services exist.
NEXT a full-width navy section with crisp white heading 'Three steps. One clear process.' Three open columns with big blue 01/02/03, 'Pick & Pay' / 'We Deliver' / 'You Grow'; small support text about selecting a service, delivery according to service scope, and applying deliverables. No invented delivery guarantees.
BOTTOM white compact about/contact section: 'Built for businesses that move fast.' and 'Digital marketing for small businesses and entrepreneurs.' prominent blue 'Let’s talk' button and info@pulseaw.com. Slim FAQ preview with 2 rows 'How fast will I receive my deliverable?' and 'Do you offer custom packages?' plus signs.
FOOTER original logo on white, PulseAW LLC, Terms of Service / Privacy Policy / Refund Policy.
Strictly professional legible real website composition, enough room for coherent sections, readable copy, no invented testimonials, clients, certifications, results or service prices. English content matches the current website. Single final direction, not three alternatives.

