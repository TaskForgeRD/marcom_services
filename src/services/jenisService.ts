import * as jenisModel from "../models/jenisModel";

export async function getAllJenis() {
  return await jenisModel.getAllJenis();
}

export async function getJenisIdByName(name: string) {
  const jenis = await jenisModel.getJenisByName(name);
  return jenis?.id;
}
