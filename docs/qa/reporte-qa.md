# Reporte de QA · Grano

| | |
|---|---|
| **Fecha** | 2026-10-12, 17:29–17:31 (hora local) |
| **Tienda probada** | https://grano-demo-f1u40p1i1-arlequines-projects.vercel.app/ (preview de Vercel) |
| **Build de la web** | `assets/index-CGYuOw3Q.js` |
| **API** | https://grano-demo.onrender.com (con inventario v1.1) |
| **Herramienta** | MCP de Playwright, Chromium a 1280 × 900 |
| **Datos de checkout** | Nombre `Ana`, correo `ana@example.com`, teléfono `55 1234 5678`, dirección `Calle de Prueba 123, CDMX`. El teléfono y la dirección son datos de prueba: el formulario los exige (PRD, H5). |

## Resultado

**5 de 7 escenarios pasan.** Los dos que fallan son los de inventario (H6), y la causa es que esta preview tiene un build de la web anterior a la v1.1 (ver [Hallazgos](#hallazgos)). El caso de referencia del PRD pasa completo.

| # | Escenario | Esperado | Resultado |
|---|---|---|---|
| 1 | Cargar la tienda y ver el catálogo | Se muestran los 6 cafés: Huila, Chiapas, Veracruz, Oaxaca, Nariño y Tolima | ✅ Pasa: 6 tarjetas con nombre, región, proceso, tueste, notas y precio. El catálogo llega desde la API de Render, así que CORS funciona para esta URL. [01-catalogo.png](capturas/01-catalogo.png) |
| 2 | Nariño sin stock (stock 0) | La tarjeta dice «Agotado» y el botón está deshabilitado | ❌ Falla: no hay insignia y el botón dice «Agregar» y está habilitado. [02-narino.png](capturas/02-narino.png) |
| 3 | Oaxaca con poco stock (stock 3) | La tarjeta dice «¡Quedan 3!» | ❌ Falla: no aparece ninguna insignia. [03-oaxaca.png](capturas/03-oaxaca.png) |
| 4 | Caso de referencia: 2 × Huila + 1 × Chiapas con BIENVENIDA10 | Subtotal $930.00, descuento −$93.00, envío gratis, total $837.00 | ✅ Pasa: los montos coinciden exactamente y el cupón aparece como aplicado. [04-carrito-cupon.png](capturas/04-carrito-cupon.png) |
| 5 | Checkout con Ana y ana@example.com | El formulario acepta los datos y deja confirmar | ✅ Pasa. [05-checkout.png](capturas/05-checkout.png) |
| 6 | Confirmar el pedido | Se muestra un número de pedido y el resumen con total $837.00 | ✅ Pasa: pedido **GR-NF8BNFST**, «¡Gracias, Ana!», 2 × Huila, 1 × Chiapas, total $837.00. [06-confirmacion.png](capturas/06-confirmacion.png) |
| 7 | Stock después del pedido (consultado en `GET /api/products`) | Huila baja de 12 a 10 y Chiapas de 8 a 7; los demás no cambian | ✅ Pasa: Huila 10, Chiapas 7, Veracruz 10, Oaxaca 3, Nariño 0, Tolima 6. |

**Prueba adicional (fuera del guion):** agregué Nariño al carrito, ya que la tienda lo permite. La API lo rechaza con `409 OUT_OF_STOCK` y no deja continuar, así que no se puede vender un café agotado. Pero la tienda solo muestra «No hay suficiente stock para tu pedido», sin decir qué café es ni ajustar el carrito, y deja de mostrar los totales. [07-narino-agotado-en-carrito.png](capturas/07-narino-agotado-en-carrito.png)

La consola del navegador no mostró errores en la tienda, salvo el 409 esperado de la prueba adicional.

## Hallazgos

### 1. La preview tiene un build de la web anterior a la v1.1 (bloqueante para H6)
- **Evidencia:** el JavaScript desplegado (`index-CGYuOw3Q.js`) no contiene los textos «Agotado» ni «Quedan» ni el código `OUT_OF_STOCK`. Es el mismo build de antes de implementar el inventario. La API de Render, en cambio, sí tiene la v1.1: responde `stock` y el 409.
- **Impacto:** quien entre a esta URL no ve qué cafés están agotados ni cuántos quedan. Si agrega un café agotado, recibe un error genérico (prueba adicional).
- **Qué hacer:** la v1.1 ya está en el commit `a3e825f` («feat: inventario de punta a punta (v1.1)»). Hay que confirmar que ese commit esté en GitHub y que Vercel lo haya desplegado, y luego repetir los escenarios 2 y 3 en la URL de ese despliegue. Cada despliegue de Vercel genera su propia URL de preview, así que esta URL seguirá mostrando la versión vieja.

### 2. Efectos en los datos de producción
- El pedido de prueba **GR-NF8BNFST** quedó registrado en la API de Render y descontó 2 Huila y 1 Chiapas.
- Como los pedidos y el stock viven en memoria, todo vuelve a los valores iniciales la próxima vez que Render reinicie el servicio.

## Capturas
Todas en [`capturas/`](capturas/):

1. `01-catalogo.png`: página completa con los 6 cafés.
2. `02-narino.png`: tarjeta de Nariño sin «Agotado».
3. `03-oaxaca.png`: tarjeta de Oaxaca sin «¡Quedan 3!».
4. `04-carrito-cupon.png`: carrito del caso de referencia con total $837.00.
5. `05-checkout.png`: formulario de checkout lleno.
6. `06-confirmacion.png`: confirmación del pedido GR-NF8BNFST.
7. `07-narino-agotado-en-carrito.png`: prueba adicional con el 409 de la API.
