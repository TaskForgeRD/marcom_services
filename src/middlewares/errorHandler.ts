import { Elysia } from "elysia";

export const errorHandler = new Elysia().use((app) => {
  app.onError(({ code, set }) => {
    set.status = code === "NOT_FOUND" ? 404 : 500;
    return {
      success: false,
      error: code,
    };
  });

  return app;
});
