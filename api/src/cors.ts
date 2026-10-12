import cors from 'cors';

export const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:5173';

// "https://a.com, https://*.vercel.app" → ['https://a.com', 'https://*.vercel.app']
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

// "*" solo admite cualquier origen; dentro de un patrón, "*" equivale a cualquier
// texto sin "/" (p. ej. "https://*.vercel.app" admite "https://grano-abc.vercel.app").
export function isOriginAllowed(origin: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern === '*') return true;
    const regex = new RegExp(`^${escapeRegExp(pattern).replace(/\*/g, '[^/]*')}$`, 'i');
    return regex.test(origin);
  });
}

export function corsMiddleware(patterns: string[]) {
  return cors({
    origin: (origin, callback) => {
      // Sin encabezado Origin (curl, health checks) no aplica CORS.
      callback(null, !origin || isOriginAllowed(origin, patterns));
    },
  });
}
