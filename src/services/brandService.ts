import * as brandModel from "../models/brandModel";

export async function getAllBrands() {
  return await brandModel.getAllBrands();
}

export async function getBrandById(id: number) {
  return await brandModel.getBrandById(id);
}

export async function getBrandByName(name: string) {
  return await brandModel.getBrandByName(name);
}

export async function getBrandIdByName(name: string) {
  const brand = await brandModel.getBrandByName(name);
  return brand?.id;
}

export async function createBrand(name: string) {
  return await brandModel.createBrand(name);
}

export async function updateBrand(id: number, name: string) {
  return await brandModel.updateBrand(id, name);
}

export async function deleteBrand(id: number) {
  return await brandModel.deleteBrand(id);
}
