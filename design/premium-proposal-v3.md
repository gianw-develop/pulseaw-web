# PulseAW — revisión visual v3
Estado: hero de v2 aprobado por el usuario. Esta revisión propone cambios al módulo de precios y nuevas secciones. No implementada ni publicada.

## Referencias
- Hero aprobado: pulseaw-premium-mockup-v2.png. En implementación conservar ese hero; la regeneración completa puede introducir diferencias menores.
- Página completa: pulseaw-premium-mockup-v3.png.
- Detalle del módulo: pulseaw-pricing-detail-v3.png. Referencia preferente para proporciones internas, precio y legibilidad del selector.
- Logo original: ../public/logo.png, reutilizar sin reconstruirlo.
- Catálogo y límites comerciales: premium-proposal-v2.md. Precios invariables 1500, 2800, 3900, 4900, 6500, 8000 USD.
- Generación: herramienta ImageGen integrada; prompts premium-v3-prompt.txt y premium-v3-detail-prompt.txt.

## Composición
Hero navy aprobado, franja de principios, nueva sección de público objetivo, módulo protagonista de servicios, entregables ilustrativos, proceso por hitos, FAQ y contacto.
El módulo usa selector vertical de seis servicios (aprox. 25–30%) y escenario navy de detalle (70–75%). Selección inicial: Founder Growth Launch. El precio $8,000 se presenta en blanco de gran tamaño, junto al CTA y encima de alcance. Escena conceptual con cuatro piezas Strategy, Funnel, CRM, Acquisition. No son resultados ni un software vendido.
Preservar identidad, jerarquía y profundidad al implementar; no sustituir el escenario por iconos básicos ni usar la captura completa como interfaz.

## Estados y acciones previstos
- Seis botones de selección accesibles; clic, toque o teclado actualizan conjuntamente título, precio, imagen, alcance, entregables y CTA. Usar aria-pressed o patrón de pestañas completo, foco visible.
- Transición de panel con fundido 200 ms, sin animación numérica de precios ni reproducción automática; transición inmediata con movimiento reducido.
- Selección 01: mapa de mercado y documento estratégico; 02: landing y recorrido del lead; 03: pipeline y automatizaciones; 04: estructura de campañas; 05: registro y secuencia de evento; 06: sistema integrado. Estas cinco escenas alternativas aún deben derivarse al preparar recursos; no están demostradas por la imagen actual.
- CTA enlaza con contacto y preselecciona el servicio. No integrar los antiguos precios o enlaces de pago.
- En móvil: seis selectores compactos dispuestos sin desplazamiento horizontal, panel debajo, precio/CTA antes del arte si hace falta; alcance en dos columnas o apilado. Entregables y proceso se apilan. Menú accesible.
- FAQ: cuatro temas visibles en mockup; primero expandido. Botones con aria-expanded/aria-controls y animación 180 ms, sin animación bajo movimiento reducido.
- Hover/focus 150 ms; anclas 300 ms. No parallax ni escenas rotando sin control.
- Contacto: conservar email real; funcionalidad de formulario y destino deben verificarse durante implementación. No afirmar integración activa con CRM o agenda.

## Contenido y revisión
La sección de entregables debe decir claramente: “Deliverables depend on the engagement you choose.” El texto diminuto generado en esa posición está deformado y no sirve como copy.
No prometer que todos reciben CRM, campañas o seguimiento: esos alcances dependen del servicio. Para el servicio de $8,000, 30 días de optimización empiezan al activar campañas, según propuesta v2.
La escena de detalle amplía la página y tiene pequeñas variaciones de encuadre; conservar la jerarquía del detalle y el orden de la página.
No se incorporan clientes, casos, testimonios ni resultados sin evidencia. Las imágenes de entregables son ilustrativas.
Revisión visual: se verificaron seis servicios y precios en ambas imágenes, hero reconocible, CTA visible y nuevas secciones presentes. Son mockups estáticos; responsive, interacción y fidelidad deben probarse en la implementación real.

