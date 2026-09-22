# PulseAW — implementación del diseño aprobado

## Entrega
Implementación de la dirección aprobada por el usuario el 10 de septiembre de 2026. Referencias: hero de pulseaw-premium-mockup-v2.png, estructura de pulseaw-premium-mockup-v3.png y módulo de pulseaw-pricing-detail-v3.png.

Se mantiene el archivo original public/logo.png. Inter se aloja localmente con su licencia OFL; imágenes generadas derivadas de los mockups en public/images, optimizadas a WebP (aproximadamente 792 KB las ocho juntas). Next Image sirve tamaños responsivos y formatos AVIF/WebP.

Seis servicios, con importes 1500, 2800, 3900, 4900, 6500 y 8000 USD. El selector cambia escena, título, precio, alcance y entregables. La consulta preselecciona el servicio. Secciones de público, entregables, método, FAQ y contacto. Catálogo y condiciones de alcance en app/engagements.ts.

## Fidelidad y adaptación
- Hero: mismo mensaje, distribución de texto/escena, paleta y lenguaje arquitectónico; imagen derivada sin texto decorativo pequeño. Texto y CTA nativos.
- Inversión: selector de seis opciones, panel navy, escena dimensional, precio blanco protagonista, alcance y entregables. Escenas adicionales siguen la dirección aprobada y representan cada servicio.
- Añadido desplegable de alcance completo para evitar ambigüedad comercial.
- Móvil: hero apilado, selector de dos columnas, panel y CTA completos, alcance de dos columnas; entregables y proceso apilados. Tablet preserva dos columnas y ajusta el encuadre del hero.
- Las ilustraciones no representan resultados de clientes. No hay métricas o testimonios ficticios.

## Verificación
- npm run build: compilación de producción, TypeScript y generación estática correctos.
- npm run lint y git diff --check: sin errores.
- node --experimental-strip-types --test tests/contact-mail.test.mjs: 2 pruebas correctas, incluidos caracteres especiales y consulta sin servicio seleccionado.
- Navegador: revisión visual a 1280 y 1440 px, móvil de 390 px, tablet de 820 px. Sin desbordamiento horizontal en tamaños comprobados. Ajuste de encuadre detectado y corregido en tablet.
- Se recorrieron las seis selecciones y se verificaron conjuntamente precio, título, imagen, alcance, entregables y una sola selección activa.
- Probada activación por teclado (Enter), menú móvil, expansión de alcance, FAQ y cierre Escape del diálogo con retorno de foco.
- Formulario: servicio preseleccionado, campos obligatorios y validación nativa. No se enviaron mensajes de prueba.
- Páginas legales: rutas accesibles, un main por página, subtítulos legibles, sin desbordamiento en tablet. Consola de la compilación de producción sin errores ni advertencias observados.
- Movimiento reducido contemplado mediante CSS; no se modificó la preferencia del sistema del usuario para probarla.

## Contacto y límites
El formulario prepara un borrador mediante mailto; indica que abre la aplicación de correo y no afirma que el mensaje ya se haya enviado. El cliente revisa y envía desde su aplicación. No hay API de envío, CRM conectado, agenda ni nuevos cobros automáticos. Se conserva info@pulseaw.com.

Los enlaces antiguos de compra se retiran de la portada. No se alteran los proyectos externos ni el subproyecto stripe-automation. Las condiciones descriptivas de servicios/entrega y el texto sobre privacidad del formulario reflejan el nuevo flujo; la política de reembolso existente se conserva.

## Publicación
Repositorio existente: gianw-develop/pulseaw-web, rama main. Despliegue mediante su conexión existente con Vercel; sin crear proyectos nuevos. Validar dominio público tras el push. La versión previa al cambio es fcb5ab7c1133002c6f96478272cd06bea97ad5d9.


## Public service listing (2026-09-22)

Added the owner-approved twelve individual services on `/services`, reusing the existing
secondary-page header/footer, fonts, colors and responsive spacing. The home page gains
a navigation/footer link; the approved hero and engagement module remain unchanged.
The listing uses a single column of service rows on mobile and a price/action column
from the existing small-screen breakpoint. Enquiries use the existing mailto flow.
Private invoice services are never rendered. Build/HTML/link checks passed; visual
Chrome QA could not run because browser automation fails at Windows sandbox startup.
