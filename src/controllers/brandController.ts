import { Elysia } from "elysia";
import * as brandService from "../services/brandService";

export const brandController = new Elysia().get("/api/brands", async () => {
  return await brandService.getAllBrands();
});
