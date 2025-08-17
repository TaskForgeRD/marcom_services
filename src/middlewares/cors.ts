import { Elysia } from "elysia";

export const corsMiddleware = new Elysia().onRequest(({ request, set }) => {
  set.headers["Access-Control-Allow-Origin"] = "*";
  set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  set.headers["Access-Control-Allow-Methods"] =
    "GET, POST, PUT, DELETE, OPTIONS";

  if (request.method === "OPTIONS") {
    set.status = 204;
    return new Response(null);
  }
});
