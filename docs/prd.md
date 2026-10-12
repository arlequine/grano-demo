# PRD · Grano v1

Fuente: [pvb.md](pvb.md) y [catalogo.csv](catalogo.csv).

## Problema
Quien toma café a diario y quiere pasar al café de especialidad no sabe qué elegir: las descripciones usan jerga y el costo final (con envío) aparece tarde. Los microtostadores locales venden por WhatsApp e Instagram, sin una tienda en línea, y reciben pedidos incompletos.

## Objetivo y métrica
Validar la demanda con **100 pedidos en el primer mes**. Métricas de apoyo: ticket promedio ≥ $600 MXN, conversión de visita a compra ≥ 2 %, % de carritos que llegan a checkout y % de pedidos con cupón.

## Usuario principal y escenario
**Bebedor curioso**: 25–40 años, toma café diario y compra 1–2 bolsas al mes.
*Escenario:* Ana quiere dejar el café de supermercado. Entra a Grano desde el celular, compara los cafés por sus notas de cata («panela, durazno, cacao»), agrega dos bolsas de Huila y una de Chiapas, aplica BIENVENIDA10, ve que el envío le sale gratis y confirma el pedido. Recibe su número de pedido en la misma pantalla.

## Historias de usuario
**H1 · Ver el catálogo.** Como bebedor curioso, quiero ver los cafés con origen, proceso, tueste, notas y precio para elegir sin conocer la jerga.
- Se muestran los 6 cafés de catalogo.csv con nombre, región, proceso, tueste, notas de cata, precio en MXN y peso (340 g).
- Las notas de cata se muestran como etiquetas separadas, no como texto con «;».

**H2 · Armar el carrito.** Como bebedor curioso, quiero agregar, cambiar cantidades y quitar cafés para decidir cuánto comprar.
- Puedo agregar un café desde el catálogo; si ya está en el carrito, su cantidad aumenta en 1.
- Puedo cambiar la cantidad (entero ≥ 1) o quitar la línea; con el carrito vacío no puedo ir a checkout.
- Cada cambio actualiza subtotal, descuento, envío y total con los valores que devuelve la API.

**H3 · Aplicar el cupón de bienvenida.** Como cliente nuevo, quiero aplicar BIENVENIDA10 para obtener 10 % de descuento.
- BIENVENIDA10 descuenta el 10 % del subtotal y el descuento se muestra en una línea propia.
- Un código inválido muestra «Cupón no válido» y no altera el total.
- Puedo quitar el cupón y el total vuelve a calcularse.

**H4 · Conocer el costo total antes de pagar.** Como bebedor curioso, quiero ver el envío y el total antes de confirmar para no llevarme sorpresas.
- Envío de $99; gratis si el subtotal con descuento es ≥ $600 (el límite exacto de $600 tiene envío gratis).
- Si falta poco para el envío gratis, se indica cuánto falta (p. ej., «Te faltan $50 para envío gratis»).

**H5 · Confirmar el pedido.** Como bebedor curioso, quiero confirmar con mis datos de envío y recibir un número de pedido.
- El formulario pide nombre, correo, teléfono y dirección; todos son obligatorios y el correo debe ser válido.
- Al confirmar, la API recalcula el total, registra el pedido y devuelve un número de pedido único, que se muestra junto con el resumen.
- Si la API rechaza el pedido, se muestra el error y el carrito se conserva.

## Caso de referencia para QA
Carrito: 2 × Huila ($320) + 1 × Chiapas ($290), cupón BIENVENIDA10.

| Concepto | Cálculo | Monto (MXN) |
|---|---|---|
| Subtotal | 2 × 320 + 1 × 290 | $930.00 |
| Descuento BIENVENIDA10 | 10 % × 930 | −$93.00 |
| Subtotal con descuento | 930 − 93 | $837.00 |
| Envío | 837 ≥ 600 → gratis | $0.00 |
| **Total** | | **$837.00** |

Control: el mismo carrito sin cupón da subtotal $930, envío $0 y total $930.

## Requisitos no funcionales
- **Una sola fuente de precios:** subtotal, descuento, envío y total se calculan solo en la API; el frontend muestra lo que recibe. La API ignora cualquier precio enviado por el cliente y usa el catálogo.
- **Exactitud:** montos en MXN con 2 decimales; redondeo a centavos solo en el descuento.
- **Validación:** la API valida toda entrada (ids de café, cantidades, cupón, datos de envío) y responde 400 con un mensaje claro.
- **Rendimiento:** el recálculo del carrito responde en < 300 ms (p95) para que el total se sienta en tiempo real.
- **Móvil primero:** usable en pantallas desde 360 px de ancho.
- **Calidad:** las reglas de precio tienen pruebas automatizadas que incluyen el caso de referencia y el límite de $600.

## Fuera de alcance (v1)
Pagos reales, cuentas de usuario, suscripciones y panel del microtostador. Al no haber cuentas, v1 **no verifica** que BIENVENIDA10 se use solo en la primera compra. Tampoco: inventario, cálculo de envío por zona, otros cupones ni notificaciones por correo.
