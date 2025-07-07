import { Elysia } from "elysia";
import * as fiturService from "../services/fiturService";

export const fiturController = new Elysia().get("/api/fitur", async () => {
  return await fiturService.getAllFitur();
});
