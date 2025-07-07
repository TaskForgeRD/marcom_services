import { Elysia } from "elysia";
import * as jenisService from "../services/jenisService";

export const jenisController = new Elysia().get("/api/jenis", async () => {
  return await jenisService.getAllJenis();
});
