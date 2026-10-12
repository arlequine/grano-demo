import { createApp } from './app.js';
import { parseAllowedOrigins } from './cors.js';

const port = Number(process.env.PORT ?? 3001);
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

createApp({ allowedOrigins }).listen(port, () => {
  console.log(`API de Grano en http://localhost:${port} · CORS: ${allowedOrigins.join(', ')}`);
});
