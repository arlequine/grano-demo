import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { isOriginAllowed, parseAllowedOrigins } from '../src/cors.js';

describe('parseAllowedOrigins', () => {
  it('separa por comas, quita espacios y la barra final', () => {
    expect(parseAllowedOrigins(' https://a.com/ ,https://*.vercel.app,, ')).toEqual([
      'https://a.com',
      'https://*.vercel.app',
    ]);
  });

  it('usa localhost:5173 si la variable no existe', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['http://localhost:5173']);
  });
});

describe('isOriginAllowed', () => {
  it('admite coincidencias exactas', () => {
    expect(isOriginAllowed('https://a.com', ['https://a.com'])).toBe(true);
    expect(isOriginAllowed('https://b.com', ['https://a.com'])).toBe(false);
  });

  it('admite cualquier origen con "*"', () => {
    expect(isOriginAllowed('https://cualquiera.dev', ['*'])).toBe(true);
  });

  it('admite el comodín dentro de un patrón', () => {
    const patterns = ['https://*.vercel.app'];
    expect(isOriginAllowed('https://grano-abc123.vercel.app', patterns)).toBe(true);
    expect(isOriginAllowed('https://vercel.app.evil.com', patterns)).toBe(false);
    expect(isOriginAllowed('http://grano.vercel.app', patterns)).toBe(false);
  });

  it('trata los puntos del patrón como literales', () => {
    expect(isOriginAllowed('https://axcom', ['https://a.com'])).toBe(false);
  });
});

describe('encabezados CORS', () => {
  const app = createApp({ allowedOrigins: ['http://localhost:5173', 'https://*.vercel.app'] });

  it('responde con el origen permitido', async () => {
    const res = await request(app).get('/api/products').set('Origin', 'https://grano-x.vercel.app');
    expect(res.headers['access-control-allow-origin']).toBe('https://grano-x.vercel.app');
  });

  it('responde el preflight', async () => {
    const res = await request(app)
      .options('/api/cart/quote')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('no envía encabezado para un origen no permitido', async () => {
    const res = await request(app).get('/api/products').set('Origin', 'https://otro.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
