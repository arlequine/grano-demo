# CLAUDE.md · Grano

Tienda de café de especialidad (proyecto de demo de AI for Developers · 30X).

## Contexto de producto
- La fuente de verdad del producto es docs/pvb.md. Si existen, docs/prd.md (requisitos) y docs/plan.md (plan técnico) mandan sobre cualquier suposición.
- Escribe documentación y textos de interfaz en español neutro. El código (identificadores) va en inglés.

## Stack
- api/: Node 22 + Express 4 + TypeScript. Validación con zod. Tests con Vitest + Supertest. Puerto 3001.
- web/: React 18 + Vite 5 + TypeScript. Sin router ni librerías de estado. Puerto 5173.
- Despliegue: api/ en Render (render.yaml), web/ en Vercel (root directory web, variable VITE_API_URL).

## Reglas de trabajo
- Las reglas de precio (subtotal, cupón, envío) viven solo en la API. El frontend muestra lo que devuelve la API, no recalcula.
- Antes de dar algo por terminado: npm test y npm run build en api/, y npm run build en web/.
- Cambios pequeños y enfocados. No agregues dependencias sin decir por qué.
- No toques render.yaml ni la configuración de despliegue salvo que se pida.
- No hagas git commit, git push ni merges: eso lo hace la persona.

## Comandos
- Instalar todo: npm run setup (en la raíz).
- Desarrollo (API + web): npm run dev (en la raíz).
- Tests de la API: npm test --prefix api.
