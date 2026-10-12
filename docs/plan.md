# Plan técnico · Grano v1

Fuentes: [pvb.md](pvb.md), [prd.md](prd.md) y [catalogo.csv](catalogo.csv). Si este plan contradice al PRD, manda el PRD.

## 1. Arquitectura

```
grano-demo/
├── package.json        scripts raíz: setup, dev (API + web en paralelo)
├── api/                Node 22 + Express 4 + TypeScript · puerto 3001 · Render
│   └── src/
│       ├── data/catalog.json  los 6 cafés, generado desde docs/catalogo.csv (npm run catalog)
│       ├── catalog.ts      expone el catálogo y la búsqueda por id
│       ├── pricing.ts      reglas de precio, función pura sin Express
│       ├── schemas.ts      validación de entrada con zod
│       ├── orders.ts       almacenamiento de pedidos en memoria
│       ├── app.ts          rutas, CORS y manejo de errores (exporta la app para Supertest)
│       └── server.ts       arranque (lee PORT)
│   └── test/               Vitest + Supertest
└── web/                React 18 + Vite 5 + TypeScript · puerto 5173 · Vercel
    └── src/
        ├── api.ts          cliente fetch; base en VITE_API_URL
        ├── App.tsx         estado del carrito y vista activa (catálogo / checkout / confirmación)
        └── components/     ProductCard, Cart, CouponForm, CheckoutForm, OrderConfirmation
```

**Decisiones**
- **La API es la única que calcula precios.** El frontend solo envía `productId`, `quantity` y `couponCode`, y muestra los montos que le devuelve la API. Ni siquiera calcula «te faltan $X»: ese dato también viene de la API.
- **Montos en centavos enteros** (`930.00 MXN` → `93000`) en la API y en el contrato, para evitar errores de punto flotante. El frontend los formatea con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
- **Catálogo en JSON.** `npm run catalog` convierte `docs/catalogo.csv` en `api/src/data/catalog.json`, y una prueba verifica que coincidan. Así la API no depende de leer archivos fuera de `api/` en Render.
- **Pedidos en memoria (`Map`).** No hay base de datos en v1, así que los pedidos se pierden si la API se reinicia. Es aceptable para la demo; ver los riesgos en la sección 5.
- **Inventario en memoria (v1.1).** El stock inicial está en `api/src/data/stock.json` (aparte del catálogo, porque cambia con cada venta) e `inventory.ts` lo lleva en un `Map`. Cotizar verifica el stock; crear un pedido lo verifica y lo descuenta todo o nada. Al reiniciar, el stock vuelve a los valores iniciales.
- **Sin router ni librería de estado.** La vista activa es un `useState` en `App`.
- **CORS:** se permiten los orígenes de `ALLOWED_ORIGINS`, una lista separada por comas. `*` solo admite cualquier origen; dentro de un patrón (`https://*.vercel.app`), `*` equivale a cualquier texto sin `/`. Si la variable no existe, se usa `http://localhost:5173`.
- **Dependencias nuevas:** `cors` (la web y la API están en dominios distintos) y `concurrently` en la raíz (para que `npm run dev` levante ambas). Las demás vienen del stack de CLAUDE.md.

## 2. Contrato de la API

Base: `VITE_API_URL` (en desarrollo, `http://localhost:3001`). JSON en todas las respuestas. Montos en centavos MXN.

### Identificadores del catálogo
`huila`, `chiapas`, `veracruz`, `oaxaca`, `narino`, `tolima` (el nombre en minúsculas y sin acentos).

### `GET /health`
`200 { "status": "ok" }`. Lo usa Render como health check.

### `GET /api/products`
`200`
```json
{ "products": [ {
  "id": "huila", "name": "Huila", "region": "Huila, Colombia",
  "process": "Lavado", "roast": "Medio",
  "notes": ["Panela", "Durazno", "Cacao"],
  "priceCents": 32000, "grams": 340, "stock": 12
} ] }
```

### `POST /api/cart/quote`
Calcula el carrito. No guarda nada y se llama en cada cambio del carrito o del cupón.

Cuerpo:
```json
{ "items": [ { "productId": "huila", "quantity": 2 }, { "productId": "chiapas", "quantity": 1 } ],
  "couponCode": "BIENVENIDA10" }
```
- `items`: de 1 a 6 líneas. Si un `productId` se repite, sus cantidades se suman.
- `quantity`: entero de 1 a 20.
- `couponCode`: opcional. Se le quitan los espacios de los extremos y se convierte a mayúsculas.

`200` (es el caso de referencia del PRD):
```json
{
  "lines": [
    { "productId": "huila",   "name": "Huila",   "unitPriceCents": 32000, "quantity": 2, "lineTotalCents": 64000 },
    { "productId": "chiapas", "name": "Chiapas", "unitPriceCents": 29000, "quantity": 1, "lineTotalCents": 29000 }
  ],
  "subtotalCents": 93000,
  "coupon": { "code": "BIENVENIDA10", "status": "applied" },
  "discountCents": 9300,
  "discountedSubtotalCents": 83700,
  "shippingCents": 0,
  "amountToFreeShippingCents": 0,
  "totalCents": 83700
}
```
- Sin cupón, `coupon` vale `null`.
- Con un cupón desconocido, la respuesta sigue siendo `200`, con `coupon: { "code": "XYZ", "status": "invalid", "message": "Cupón no válido" }` y `discountCents: 0`. Así el carrito sigue mostrando sus montos (PRD, H3).

### `POST /api/orders`
Cuerpo: el mismo de `quote` más los datos de envío.
```json
{ "items": [...], "couponCode": "BIENVENIDA10",
  "customer": { "name": "Ana López", "email": "ana@correo.com", "phone": "5512345678", "address": "Calle 1 #2, CDMX, 01000" } }
```
- `customer`: los cuatro campos son obligatorios. Al texto se le quitan los espacios de los extremos y no puede quedar vacío. `email` debe tener formato de correo. `phone` admite de 10 a 15 caracteres entre dígitos, espacios y el signo `+`.

`201`
```json
{ "orderId": "GR-7K3M9QXA", "createdAt": "2026-10-12T18:00:00.000Z",
  "customer": { ... }, "quote": { ...igual que la respuesta de quote... } }
```
- La API recalcula todo con el catálogo y nunca usa montos enviados por el cliente.
- `orderId` es `GR-` seguido de 8 caracteres en mayúsculas sin ambigüedad (sin 0/O ni 1/I) generados con `crypto`. Si ya existe, se genera otro.
- Al crearse el pedido se descuenta el stock de cada café. Si falta stock no se descuenta nada.

### Stock (v1.1)
`quote` y `orders` responden `409 OUT_OF_STOCK` si la cantidad pedida de un café (sumando líneas repetidas) supera su stock. Hay un `details` por cada café que no alcanza:
```json
{ "error": { "code": "OUT_OF_STOCK", "message": "No hay suficiente stock para tu pedido",
  "details": [ { "path": "items.oaxaca", "message": "Solo quedan 3 de Oaxaca", "productId": "oaxaca", "requested": 4, "available": 3 } ] } }
```
Orden de validación: 400 (formato) → 422 (producto desconocido; cupón inválido en `orders`) → 409 (stock).

### Errores
Todas las respuestas de error tienen la forma `{ "error": { "code": "...", "message": "...", "details"?: [...] } }`. Los `message` están en español.

| Código HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Cuerpo que no es JSON, `items` vacío, cantidad fuera de rango, `customer` incompleto o correo inválido. `details` trae `{ path, message }` por campo. |
| 422 | `UNKNOWN_PRODUCT` | Un `productId` no existe en el catálogo. |
| 409 | `OUT_OF_STOCK` | Se pide más de lo que hay de algún café (v1.1). |
| 422 | `INVALID_COUPON` | Solo en `POST /api/orders`: el cupón no es válido. Se rechaza para que no se cree un pedido con un cupón que la persona creyó aplicado. |
| 404 | `NOT_FOUND` | La ruta no existe. |
| 500 | `INTERNAL_ERROR` | Error inesperado. Se registra en el log y no se expone el detalle. |

## 3. Reglas de precio paso a paso

La función pura `quote(items, couponCode?)` en `pricing.ts` aplica estas reglas en orden, siempre en centavos enteros:

1. **Normalizar las líneas:** sumar cantidades de `productId` repetidos y buscar cada uno en el catálogo. Si alguno no existe, el resultado es `UNKNOWN_PRODUCT`.
2. **Total por línea:** `lineTotal = unitPrice × quantity`.
3. **Subtotal:** suma de los totales por línea.
4. **Cupón:** normalizarlo (quitar espacios y pasar a mayúsculas). Si es `BIENVENIDA10`, `discount = round(subtotal × 10 / 100)`. Si no se envió cupón o no es válido, `discount = 0`. Como los precios son pesos enteros, el redondeo en la práctica nunca cambia el resultado, pero se deja explícito.
5. **Subtotal con descuento:** `discountedSubtotal = subtotal − discount`.
6. **Envío:** `shipping = discountedSubtotal ≥ 60000 ? 0 : 9900`. El límite exacto de $600 tiene envío gratis.
7. **Faltante para envío gratis:** `amountToFreeShipping = max(0, 60000 − discountedSubtotal)`.
8. **Total:** `total = discountedSubtotal + shipping`.

**Casos de prueba obligatorios (montos en MXN)**

| Carrito | Cupón | Subtotal | Desc. | Con desc. | Envío | Total |
|---|---|---|---|---|---|---|
| 2 × Huila + 1 × Chiapas (referencia del PRD) | BIENVENIDA10 | 930 | 93 | 837 | 0 | **837** |
| 2 × Huila + 1 × Chiapas | — | 930 | 0 | 930 | 0 | 930 |
| Veracruz + Huila (exactamente en el límite) | — | 600 | 0 | 600 | 0 | 600 |
| Chiapas + Tolima (faltan $10) | — | 590 | 0 | 590 | 99 | 689 |
| Huila + Nariño (el cupón baja el subtotal del límite) | BIENVENIDA10 | 660 | 66 | 594 | 99 | 693 |
| 1 × Oaxaca | `" bienvenida10 "` | 310 | 31 | 279 | 99 | 378 |
| 1 × Oaxaca | `NOEXISTE` (estado `invalid`) | 310 | 0 | 310 | 99 | 409 |

## 4. Tareas en orden

Cada tarea termina con sus pruebas en verde. Antes de cerrar la v1 se corren `npm test` y `npm run build` en `api/`, y `npm run build` en `web/`.

1. **Raíz:** crear `package.json` con los scripts `setup` (instala en `api/` y `web/`) y `dev` (los dos servidores con `concurrently`).
2. **Esqueleto de la API:** TypeScript, Express, `GET /health`, `app.ts` separado de `server.ts`, Vitest configurado y una prueba de `/health`.
3. **Catálogo:** generar `catalog.json` desde el CSV, y una prueba que lea `docs/catalogo.csv` y verifique que coinciden.
4. **Reglas de precio:** escribir `pricing.ts` con las pruebas unitarias de la tabla de la sección 3. Las pruebas se escriben primero.
5. **Validación:** esquemas zod para `quote` y `orders`, y el manejador de errores con el formato de la sección 2.
6. **Endpoints de lectura y cálculo:** `GET /api/products` y `POST /api/cart/quote`, con pruebas Supertest para `200`, `400`, `422` y el cupón inválido.
7. **Pedidos:** `orders.ts` y `POST /api/orders`, con pruebas para `201`, la unicidad de `orderId`, `INVALID_COUPON`, un `customer` inválido y el rechazo de precios enviados por el cliente.
8. **CORS** con `ALLOWED_ORIGINS`, y una prueba que verifique el encabezado.
9. **Esqueleto de la web:** Vite + React + TypeScript, `api.ts` con `VITE_API_URL` y un formateador de moneda.
10. **Catálogo en la web:** tarjetas con origen, proceso, tueste, notas como etiquetas, precio y 340 g (PRD, H1). Diseño móvil primero, desde 360 px.
11. **Carrito:** agregar, cambiar cantidad y quitar productos. En cada cambio se llama a `quote` y se muestran sus montos; con el carrito vacío, el botón de checkout queda deshabilitado (H2 y H4).
12. **Cupón:** formulario para aplicarlo y quitarlo, y el mensaje «Cupón no válido» (H3).
13. **Checkout y confirmación:** formulario con validación básica, `POST /api/orders`, pantalla con el `orderId` y el resumen. Si hay error, se muestra y el carrito se conserva (H5).
14. **Verificación completa:** pruebas y builds, y un recorrido manual del caso de referencia que debe dar $837.00.
15. **Despliegue (solo con aprobación de la persona):** crear `render.yaml` y configurar Vercel (root `web`, `VITE_API_URL`; `ALLOWED_ORIGINS` en Render). CLAUDE.md pide no tocar el despliegue salvo que se pida.

16. **Inventario (v1.1):** `stock.json` e `inventory.ts`, `stock` en `GET /api/products`, `409 OUT_OF_STOCK` en `quote` y `orders`, y descuento al crear el pedido. En la web: «Agotado», «¡Quedan N!» (3 o menos), el + limitado al stock y el ajuste del carrito ante un 409.

## 5. Riesgos y supuestos
- **Pedidos en memoria:** el plan gratuito de Render reinicia o duerme la instancia, así que los pedidos se pierden. Si se quiere medir la meta de 100 pedidos, hará falta persistencia (fuera de v1).
- **Stock en memoria:** cada reinicio de Render devuelve el stock a los valores iniciales, y el carrito no aparta bolsas: dos personas pueden tener la última en el carrito y solo la primera en confirmar se la lleva (la otra recibe 409).
- **Arranque en frío de Render:** la primera llamada puede tardar varios segundos y no cumplir los < 300 ms del PRD. La web debe mostrar un estado de «cargando».
- **Límites que fijé yo:** 20 bolsas por línea, 6 líneas y el formato del teléfono no vienen del PVB ni del PRD. Se pueden ajustar.
