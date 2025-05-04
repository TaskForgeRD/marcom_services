import * as brandModel from '../models/brandModel';

export async function getAllBrands() {
  return await brandModel.getAllBrands();
}

export async function getBrandIdByName(name: string) {
  const brand = await brandModel.getBrandByName(name);
  return brand?.id;
}