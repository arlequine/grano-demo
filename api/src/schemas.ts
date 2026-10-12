import { z } from 'zod';
import { mergeItems } from './pricing.js';

export const MAX_LINES = 6;
export const MAX_QUANTITY = 20;

const itemSchema = z.object({
  productId: z.string().trim().min(1, 'El producto es obligatorio'),
  quantity: z
    .number({ invalid_type_error: 'La cantidad debe ser un número' })
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1')
    .max(MAX_QUANTITY, `La cantidad máxima es ${MAX_QUANTITY}`),
});

const itemsSchema = z
  .array(itemSchema, { required_error: 'El carrito es obligatorio' })
  .min(1, 'El carrito está vacío')
  .superRefine((items, ctx) => {
    const merged = mergeItems(items);
    if (merged.length > MAX_LINES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `El carrito admite máximo ${MAX_LINES} productos` });
    }
    for (const { productId, quantity } of merged) {
      if (quantity > MAX_QUANTITY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `La cantidad máxima de «${productId}» es ${MAX_QUANTITY}`,
        });
      }
    }
  });

// `required` concuerda en género con el campo: «El nombre es obligatorio», «La dirección es obligatoria».
const requiredText = (field: string, max: number, required = 'obligatorio') =>
  z
    .string({ required_error: `${field} es ${required}`, invalid_type_error: `${field} debe ser texto` })
    .trim()
    .min(1, `${field} es ${required}`)
    .max(max, `${field} admite máximo ${max} caracteres`);

export const quoteRequestSchema = z.object({
  items: itemsSchema,
  couponCode: z.string().max(50, 'El cupón admite máximo 50 caracteres').optional(),
});

export const customerSchema = z.object({
  name: requiredText('El nombre', 100),
  email: requiredText('El correo', 254).email('El correo no es válido'),
  phone: requiredText('El teléfono', 15).regex(
    /^[\d +]{10,15}$/,
    'El teléfono debe tener de 10 a 15 caracteres entre dígitos, espacios y +',
  ),
  address: requiredText('La dirección', 300, 'obligatoria'),
});

export const orderRequestSchema = quoteRequestSchema.extend({
  customer: customerSchema,
});

export type Customer = z.infer<typeof customerSchema>;
