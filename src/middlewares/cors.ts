import { Elysia } from 'elysia';

export const corsMiddleware = new Elysia().use(async app => {
  app.onRequest(({ request, set }) => {
    if (request.method === 'OPTIONS') {
      set.status = 204;
      set.headers['Access-Control-Allow-Origin'] = '*';
      set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      set.headers['Access-Control-Allow-Headers'] = 'Content-Type';
      return new Response(null);
    }
    set.headers['Access-Control-Allow-Origin'] = '*';
  });
  return app;
});