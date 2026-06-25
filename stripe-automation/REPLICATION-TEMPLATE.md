# Plantilla de réplica — Stripe Automation System

> Guía completa y probada para replicar el sistema en cualquier LLC nueva.
> Actualizada tras el proyecto real de AWGenesis LLC (Junio 2026).

---

## Cómo arrancar una nueva réplica

Usuario dice: **"vamos a replicar para [LLC]"**.

Pedir en un solo mensaje los **5 bloques** de abajo. Cuando el usuario los entrega, ejecutar los **pasos 1–13** en orden. No saltarse ninguno.

**Regla de oro:** usar SIEMPRE el proyecto existente del usuario. NUNCA crear un segundo proyecto de Vercel para la misma funcionalidad.

---

## Bloques de información — SIEMPRE pedir antes de empezar

### Bloque 1 — Identidad
- [ ] Nombre legal de la LLC
- [ ] Dominio principal (ej. `empresa.com`)
- [ ] ¿Tiene proyecto Vercel ya creado? Si sí, **nombre exacto del proyecto**
- [ ] ¿Tiene proyecto Supabase ya creado? Si sí, URL y service role key

### Bloque 2 — Stripe
- [ ] Live secret key (`sk_live_...`) — pedirla pero **NUNCA escribirla en el chat**. Indicar que la pongan en `.env` directamente
- [ ] ¿Tiene ToS URL y Privacy Policy URL en Stripe Dashboard → Settings → Public details?
  - Si NO → crear páginas en la web pública ANTES de seguir
  - Sin estas URLs el script de Payment Links falla con error claro

### Bloque 3 — Catálogo de productos fijos (web pública)
- [ ] Tipo de negocio (para proponer servicios coherentes si el cliente no tiene catálogo)
- [ ] Precio mínimo y máximo deseado
- [ ] Nombres exactos si los tiene — si no, proponer basado en la web y confirmar
- [ ] **Regla de precios**: empezar desde $10–$15 mínimo. Clientes frecuentemente pagan montos bajos ($10, $15, $20). No empezar desde $50+

### Bloque 4 — Open-amount links privados
- [ ] Cuántos (recomendado: 2)
- [ ] Nombre de cada uno (aparece en el checkout)
- [ ] **IMPORTANTE**: estos links NO se crean con el script normal ni desde el Dashboard de Stripe. Crearlos con el snippet de Node.js al final de este archivo

### Bloque 5 — Catálogo interno (no público)
- [ ] ¿Adaptar al negocio o usar el genérico del template?
- [ ] Debe contener servicios reales de la empresa que NO aparezcan en la web
- [ ] Precios sugeridos: $5, $10, $15, $20, $25, $30, $35, $40, $50
- [ ] Montos de $1 a $5 se absorben como "Processing Fee", nunca como servicio interno
- [ ] El algoritmo siempre prioriza servicios públicos fijos y completa con internos
- [ ] Ningún servicio público puede repetirse dentro de la misma factura

---

## Estructura central — NO se modifica entre réplicas

| Componente | Archivo | Qué hace |
|---|---|---|
| Algoritmo | `src/algorithm.js` | Cascada `fixed → hybrid → internal → closest`. Siempre prioriza FIXED_PRODUCTS. Hash SHA-256 para evitar combos repetidos. |
| Webhook | `src/webhookHandler.js` | Lock atómico, resolución de cliente desde 6 fuentes, generación de invoice. |
| Stripe service | `src/stripeService.js` | Crea invoiceItems (con `stripePriceId` para fijos, amount+name para variables), invoice, paga out-of-band. |
| Supabase service | `src/supabaseService.js` | Locks distribuidos, hashes usados, idempotencia. |
| Script Products | `scripts/create-stripe-products.js` | Registra Products + Prices en Stripe (una sola vez por LLC). |
| Script Payment Links | `scripts/create-stripe-payment-links.js` | Crea Payment Links fijos con config compliance. |

### Flujos de cobro

- **Flujo A (público)**: cliente compra en la web → Payment Link fijo → invoice `source: fixed`
- **Flujo B (privado)**: owner comparte open-amount link 1:1 → invoice `source: hybrid` (1 fijo + fill variable) o `fixed` si coincide exacto

### Config de Payment Links (fijos)
```js
{
  billing_address_collection: "auto",
  custom_fields: [{ key: "full_name", label: { type: "custom", custom: "Full name" }, type: "text", optional: false }],
  phone_number_collection: { enabled: true },
  consent_collection: { terms_of_service: "required" },
  customer_creation: "always",
  allow_promotion_codes: true,  // NO usar en open-amount links — Stripe lo rechaza
}
```

---

## Pasos de réplica (orden probado — NO saltarse ninguno)

### PASO 1 — Preparar entorno local
```bash
# Clonar este template o el repo de la LLC si ya existe
npm install
cp .env.example .env
# Abrir .env y poner STRIPE_SECRET_KEY=sk_live_... de la LLC
```
⚠️ Nunca hacer commit del `.env`. Está en `.gitignore`.

### PASO 2 — Crear páginas legales en la web
Antes de cualquier script de Stripe, la cuenta debe tener ToS y Privacy configurados.

**Si la web es Next.js/React**, crear dos páginas:
- `/terms-of-service` — Terms of Service
- `/privacy-policy` — Privacy Policy
- `/refund-policy` — Refund Policy (recomendado)

Luego ir a **Stripe Dashboard → Settings → Public details** y pegar las URLs.

Sin esto el script de Payment Links falla con: *"You cannot collect consent to your terms of service unless a URL is set"*

### PASO 3 — Adaptar catalog.js
Editar `src/catalog.js`:
- `FIXED_PRODUCTS`: 8–15 productos con precios desde $10 hasta $200, todos `kind: "service"`
- `INTERNAL_SERVICES`: servicios reales de la empresa que NO se muestran en la web, con precios fijos ($5, $10, $15, $20, $25, $30, $35, $40, $50)
- `PROCESSING_FEE`: deja $1–$5 para absorber residuos exactos
- Dejar todos los `stripePriceId: ""` — el siguiente script los rellena
- **Regla de oro**: FIXED_PRODUCTS nunca se repiten en una factura; INTERNAL_SERVICES sí pueden repetirse si es necesario

### PASO 4 — Registrar productos en Stripe
```bash
npm run stripe:create-products:dry    # verificar lista antes
npm run stripe:create-products:write  # crea en Stripe + escribe price_xxx en catalog.js
```
⚠️ Si el script no auto-escribe los IDs (warning "Could not locate"), copiarlos manualmente del output al `catalog.js`.

### PASO 5 — Crear Payment Links fijos
```bash
npm run stripe:create-payment-links:recreate
```
Guarda los URLs generados — van en la web de la LLC.

### PASO 6 — Identificar el proyecto Vercel correcto
**NO crear un nuevo proyecto de Vercel si el usuario ya tiene uno.**

Preguntar siempre:
- ¿Ya tienes un proyecto Vercel creado?
- ¿Cómo se llama exactamente?

Si no tiene, crearlo con el nombre correcto y enlazarlo. Si ya existe, enlazar a ese.

```bash
npx vercel link --project NOMBRE_DEL_PROYECTO_EXISTENTE
```

### PASO 7 — Desplegar backend en Vercel
```bash
npx vercel --token <VERCEL_TOKEN> --yes --prod
```
O desde el Dashboard de Vercel si el repo está conectado a GitHub.

⚠️ Si el proyecto Vercel tiene **SSO/Password Protection activo**, desactivarlo:
```bash
curl -X PATCH "https://api.vercel.com/v9/projects/<PROJECT_ID>" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection": null, "passwordProtection": null}'
```

### PASO 8 — Subir env vars a Vercel
```bash
# Desde Vercel Dashboard → Project → Settings → Environment Variables
# O vía API (ver snippet al final)
# Variables: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# STRIPE_WEBHOOK_SECRET se añade en el paso siguiente
```

**Regla crítica**: nunca asumir que las variables están correctas. Siempre verificar:
- `STRIPE_SECRET_KEY` empieza con `sk_live_`
- `SUPABASE_URL` es una URL válida
- `SUPABASE_SERVICE_ROLE_KEY` empieza con `eyJ...`

### PASO 9 — Verificar backend activo
```bash
curl https://<URL-VERCEL>/health
# Debe responder: {"status":"ok"}
```

### PASO 10 — Registrar webhook en Stripe
```bash
curl -X POST "https://api.stripe.com/v1/webhook_endpoints" \
  -u "sk_live_...:" \
  -d "url=https://<URL-VERCEL>/webhook/stripe" \
  -d "enabled_events[]=payment_intent.succeeded" \
  -d "description=<LLC>-webhook"
# Guardar el "secret": whsec_... del response
```
Luego añadir `STRIPE_WEBHOOK_SECRET=whsec_...` en Vercel env vars y redesplegar.

### PASO 11 — Crear open-amount links privados
**No se pueden crear desde el Dashboard de Stripe ni con el script normal.**
Usar este snippet directamente en la terminal:

```bash
node -e "
require('dotenv').config();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
(async () => {
  const config = {
    billing_address_collection: 'auto',
    custom_fields: [{ key: 'full_name', label: { type: 'custom', custom: 'Full name' }, type: 'text', optional: false }],
    phone_number_collection: { enabled: true },
    consent_collection: { terms_of_service: 'required' },
    customer_creation: 'always'
    // NO incluir allow_promotion_codes — Stripe lo rechaza con custom_unit_amount
  };
  const price1 = await stripe.prices.create({ currency: 'usd', custom_unit_amount: { enabled: true }, product_data: { name: 'Custom Package A' } });
  const link1 = await stripe.paymentLinks.create({ ...config, line_items: [{ price: price1.id, quantity: 1 }] });
  const price2 = await stripe.prices.create({ currency: 'usd', custom_unit_amount: { enabled: true }, product_data: { name: 'Custom Package B' } });
  const link2 = await stripe.paymentLinks.create({ ...config, line_items: [{ price: price2.id, quantity: 1 }] });
  console.log('Link 1:', link1.url);
  console.log('Link 2:', link2.url);
})().catch(e => console.error('ERROR:', e.message));
"
```
Cambiar los nombres `'Custom Package A'` y `'Custom Package B'` por los del Bloque 4.

### PASO 12 — Ejecutar schema en Supabase
Abrir **Supabase → SQL Editor** y ejecutar `supabase_schema.sql`.
Crea las tablas: `customers`, `invoices`, `payment_locks`.

### PASO 13 — Validación end-to-end
1. Usar uno de los open-amount links privados con un monto NO exacto (ej. $84)
2. Completar el pago con email + nombre + teléfono reales
3. Verificar en **Vercel → Logs**: `source: hybrid` + invoice generada
4. Verificar en **Stripe Dashboard → Invoices**: invoice pagada con line items correctos
5. Verificar en **Supabase → invoices**: fila insertada

---

## Lecciones aprendidas (AWGenesis + PulseAW, Junio 2026)

| Problema | Causa real | Prevención |
|---|---|---|
| Web en 404 tras mover Vercel | `output: 'export'` en `next.config.mjs` no es compatible con Vercel nativo | Mantener `next.config.mjs` vacío para Next.js en Vercel. Solo usar static export si se hospeda en otro lado. |
| Dominio no apunta al nuevo deploy | Alias residual de Vercel + propagación DNS | Siempre verificar `awgenesis.vercel.app` primero. Si funciona, el dominio es solo propagación/caché. |
| Webhook 400 | Vercel parseaba el body antes de la verificación de firma de Stripe | El webhook debe capturar el raw body manualmente antes de que Express/parse lo toque. |
| Webhook 500 `supabaseUrl is required` | Se desplegó en un proyecto Vercel NUEVO sin variables de entorno | **NUNCA** crear proyecto Vercel duplicado. Siempre reutilizar el existente del usuario. |
| Facturas no se creaban | Mezcla de proyecto nuevo sin env vars + firma fallando | Orden correcto: 1) variables, 2) deploy, 3) webhook, 4) probar. Nunca invertir. |
| Múltiples proyectos Vercel duplicados | Creación automática innecesaria | Preguntar siempre nombre del proyecto existente antes de enlazar/deployar. |
| Catálogo interno duplicaba servicios públicos | No había separación clara entre público e interno | `FIXED_PRODUCTS` solo servicios públicos de la web; `INTERNAL_SERVICES` solo servicios que complementan facturas |
| Servicios públicos repetidos en factura | El algoritmo permitía duplicar un mismo producto | Implementar regla: cada `FIXED_PRODUCTS` solo puede usarse una vez por invoice |
| Montos como $20 o $30 usaban solo servicios internos | El algoritmo no priorizaba públicos cuando había sobrante pequeño | Forzar al menos un `FIXED_PRODUCTS` en facturas cuando el monto lo permite |
| Processing Fee por encima de $5 | Se usaba fee para absorber cualquier residuo | Limitar Processing Fee a $1–$5; el resto debe cubrirse con servicios internos |
| Payment Links fijos fallaban al crear | Stripe requería ToS/Privacy URL configuradas | Crear páginas legales y configurar en Stripe antes de ejecutar scripts |
| Botones de pago no redirigían | Se mantuvo `disabled` en un elemento `<a>` | Usar `<a>` con `href` condicional y `preventDefault` si no hay acuerdo |
| Open-amount links fallaban | Se intentaba usar `allow_promotion_codes` con `custom_unit_amount` | No incluir `allow_promotion_codes` en Payment Links de monto abierto |

---

## Errores conocidos y soluciones

| Error | Causa | Solución |
|---|---|---|
| `You cannot collect consent to your terms of service unless a URL is set` | Stripe no tiene ToS/Privacy URL configuradas | Paso 2: crear páginas y configurar en Stripe Dashboard → Public details |
| `Could not locate FIXED_PRODUCTS entry for: ...` | El script de write no encuentra el producto por nombre | Copiar los `price_xxx` del output manualmente al `catalog.js` |
| `You cannot enable promotion codes when using a price with custom_unit_amount` | Open-amount links no soportan promotion codes | No incluir `allow_promotion_codes` en el config de open-amount links; también ocurre si se intenta crear open-amount con `unit_amount` en lugar de `custom_unit_amount` |
| Backend responde con redirect/HTML en lugar de JSON | Vercel SSO/Password Protection activo | Desactivar protección vía API (Paso 7) |
| `[webhook] Signature verification failed` | `STRIPE_WEBHOOK_SECRET` no configurado o incorrecto | Verificar que el `whsec_...` en Vercel env vars coincide con el del endpoint |
| `supabaseUrl is required` | Falta `SUPABASE_URL` en Vercel env vars | Revisar variables en el proyecto Vercel correcto y redesplegar |
| Invoice con $0 o sin line items | `pending_invoice_items_behavior` no es `"include"` | Ya corregido en `stripeService.js` — no modificar |
| `DEPLOYMENT_NOT_FOUND` | Vercel alias apunta a un deploy eliminado | Recrear alias o promover deploy actual a producción desde Dashboard |

---

## HTML para la web (Next.js / React)

Crear cards de servicio con links de Stripe:

```html
<section style="padding:60px 20px; background:#f8f8ff; font-family:sans-serif;">
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:24px; max-width:1100px; margin:0 auto;">
    <div style="background:#fff; border-radius:12px; padding:28px 24px; box-shadow:0 2px 12px rgba(0,0,0,0.07);">
      <h3 style="font-size:18px; font-weight:700; color:#1a1a2e; margin:0 0 10px;">NOMBRE SERVICIO</h3>
      <p style="color:#666; font-size:14px; margin:0 0 24px;">DESCRIPCIÓN CORTA</p>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="font-size:24px; font-weight:800; color:#5b4ff5;">$PRECIO</span>
        <a href="https://buy.stripe.com/XXXXX" target="_blank" style="background:#5b4ff5; color:#fff; font-size:14px; font-weight:600; padding:10px 22px; border-radius:6px; text-decoration:none;">Order now</a>
      </div>
    </div>
  </div>
</section>
```

La última card (producto más caro) va con fondo `#5b4ff5` para destacarla como opción premium.

---

## Notas de seguridad

- **Nunca compartir** `sk_live_...`, tokens de Vercel, ni Supabase service keys en el chat
- Si se comparten por error → rotar inmediatamente en el dashboard correspondiente
- El `.env` está en `.gitignore` — nunca hacer commit
- Los open-amount links son **solo para el owner** — nunca publicarlos en la web
