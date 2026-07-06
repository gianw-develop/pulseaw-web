# Stripe Automation — Guía de réplica para nuevas empresas

> Guía concisa y probada. Actualizada tras AWGenesis + PulseAW LLC (Junio 2026).

---

## Antes de empezar — Pedir estos datos al cliente

| # | Qué pedir | Nota |
|---|---|---|
| 1 | Nombre de la LLC + dominio | |
| 2 | `sk_live_...` de Stripe | Que la pongan directo en `.env`, nunca en el chat |
| 3 | ¿Ya tiene proyecto Vercel? Si sí, nombre exacto | Nunca crear uno nuevo si ya existe |
| 4 | URL de Supabase + service role key | |
| 5 | ¿Tiene ToS y Privacy Policy en su web? | Sin esto, los Payment Links fallan en Stripe |

---

## Reglas de oro — Leer antes de tocar cualquier archivo

### Facturas (numeración)
El número de factura de Stripe sigue el formato `PREFIJO-SECUENCIA`. **Ambos deben ser aleatorios** antes de cada factura:
```js
await stripe.customers.update(customer.id, {
  invoice_prefix: generateInvoicePrefix(),        // 8 chars aleatorios: "VDEK53A6"
  next_invoice_sequence: Math.floor(Math.random() * 9000) + 1000, // 1000–9999
});
// Resultado: "VDEK53A6-7832" — completamente distinto en cada pago
```
Sin esto, el número se ve como una secuencia visible al cliente (`-0001`, `-0002`, `-0003`...) lo que genera confusión y parece poco profesional.

### Catálogo — dos tipos, roles distintos

**`FIXED_PRODUCTS` (públicos, en la web):**
- Son los servicios reales que el cliente ve y elige
- El algoritmo los prioriza SIEMPRE — van primero en la factura
- Nunca se repite el mismo producto dentro de una factura

**`INTERNAL_SERVICES` (internos, no visibles):**
- Solo sirven para completar el monto exacto de la factura
- Deben tener variedad de precios bajos: $5, $10, $15, $20...
- **Crear 3–4 servicios distintos al precio más frecuente** (generalmente $10) para evitar que el mismo nombre aparezca dos veces en una factura
- Los $1–$5 restantes se absorben como `Processing Fee` — no como servicio

### Links de monto abierto (privados)
- Son **solo para el owner** — nunca publicarlos en la web
- **SIEMPRE configurar límite de monto**: mínimo $10, máximo $200
- Sin límite, los clientes escriben montos erróneos ($1, $2, $3) y se generan facturas inválidas
- **No agregar** `allow_promotion_codes` — Stripe lo rechaza en links de monto abierto

---

## Pasos de réplica (en orden — no saltarse ninguno)

### 1. Preparar entorno
```bash
npm install
cp .env.example .env
# Poner STRIPE_SECRET_KEY=sk_live_... en .env
```

### 2. Crear páginas legales en la web
Agregar `/terms-of-service`, `/privacy-policy` y `/refund-policy` al sitio.
Luego: **Stripe Dashboard → Settings → Public details** → pegar las URLs.
Sin esto el script de Payment Links falla.

### 3. Adaptar `src/catalog.js`
- `FIXED_PRODUCTS`: servicios de la web, precios desde $10, todos con `kind: "service"`
- `INTERNAL_SERVICES`: servicios reales internos, precios $5–$50, varios por cada precio frecuente
- Dejar todos los `stripePriceId: ""` — el script del paso siguiente los rellena

### 4. Registrar productos en Stripe
```bash
npm run stripe:create-products:dry    # ver lista antes
npm run stripe:create-products:write  # crea en Stripe + escribe price_xxx en catalog.js
```

### 5. Crear Payment Links fijos
```bash
npm run stripe:create-payment-links:recreate
```
Guardar las URLs — van en la web del cliente.

### 6. Enlazar proyecto Vercel correcto
```bash
npx vercel link --project NOMBRE_EXACTO_DEL_PROYECTO
```
**Nunca crear proyecto nuevo si el cliente ya tiene uno.**

### 7. Subir variables de entorno a Vercel
Desde **Vercel Dashboard → Settings → Environment Variables**:
- `STRIPE_SECRET_KEY` — empieza con `sk_live_`
- `SUPABASE_URL` — URL válida de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — empieza con `eyJ...`
- `STRIPE_WEBHOOK_SECRET` — se añade en el paso 9

### 8. Desplegar backend
```bash
# Desde la raíz del repo (con Root Directory = stripe-automation configurado en Vercel):
VERCEL_ORG_ID="..." VERCEL_PROJECT_ID="..." vercel --prod --yes
```
Verificar que responde: `curl https://<URL>/health` → `{"status":"ok"}`

### 9. Registrar webhook en Stripe
```bash
curl -X POST "https://api.stripe.com/v1/webhook_endpoints" \
  -u "sk_live_...:" \
  -d "url=https://<URL>/webhook/stripe" \
  -d "enabled_events[]=payment_intent.succeeded"
# Copiar el "secret": whsec_... del response
```
Agregar `STRIPE_WEBHOOK_SECRET=whsec_...` en Vercel → redesplegar.

### 10. Ejecutar schema en Supabase
Abrir **Supabase → SQL Editor** y ejecutar `supabase_schema.sql`.
Crea las tablas: `customers`, `invoices`, `payment_locks`.

### 11. Crear links de monto abierto (privados)
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
    // NO poner allow_promotion_codes aqui
  };
  const price1 = await stripe.prices.create({ currency: 'usd', custom_unit_amount: { enabled: true, minimum: 1000, maximum: 20000 }, product_data: { name: 'Custom Package A' } });
  const link1 = await stripe.paymentLinks.create({ ...config, line_items: [{ price: price1.id, quantity: 1 }] });
  const price2 = await stripe.prices.create({ currency: 'usd', custom_unit_amount: { enabled: true, minimum: 1000, maximum: 20000 }, product_data: { name: 'Custom Package B' } });
  const link2 = await stripe.paymentLinks.create({ ...config, line_items: [{ price: price2.id, quantity: 1 }] });
  console.log('Link 1:', link1.url);
  console.log('Link 2:', link2.url);
})().catch(e => console.error('ERROR:', e.message));
"
```
Cambiar `Custom Package A/B` por los nombres reales. `minimum`/`maximum` en centavos (1000 = $10, 20000 = $200).

### 12. Validación final
1. Pagar con un open-amount link usando monto no exacto (ej. $84)
2. Verificar **Vercel Logs**: `source: hybrid` + invoice generada
3. Verificar **Stripe → Invoices**: factura pagada, número de factura con formato aleatorio completo (`XXXXXXXX-XXXX`)
4. Verificar **Supabase → invoices**: fila insertada correctamente

---

## Errores frecuentes

| Error | Causa | Solución |
|---|---|---|
| `You cannot collect consent...` | Stripe no tiene ToS/Privacy URL | Paso 2: configurar en Dashboard → Public details |
| `allow_promotion_codes` error | Se usó con `custom_unit_amount` | Quitar `allow_promotion_codes` del config de links abiertos |
| `Signature verification failed` | `STRIPE_WEBHOOK_SECRET` incorrecto | Verificar que el `whsec_...` en Vercel coincide con el del endpoint |
| `supabaseUrl is required` | Falta `SUPABASE_URL` en Vercel | Revisar env vars del proyecto correcto y redesplegar |
| Invoice con $0 / sin line items | `pending_invoice_items_behavior` no es `"include"` | Ya corregido en `stripeService.js` — no modificar |
| Backend sirve HTML/redirect | Vercel SSO Protection activo | Desactivar en Dashboard → Settings → Security |

---

## Seguridad
- `.env` siempre en `.gitignore` — nunca hacer commit
- Los open-amount links son solo para el owner — nunca publicarlos
- Si se filtra una key por error → rotarla inmediatamente en el dashboard correspondiente
