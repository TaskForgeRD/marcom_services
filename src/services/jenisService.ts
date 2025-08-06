import * as jenisModel from "../models/jenisModel";

export async function getAllJenis() {
  return await jenisModel.getAllJenis();
}

export async function getJenisById(id: number) {
  return await jenisModel.getJenisById(id);
}

export async function getJenisByName(name: string) {
  return await jenisModel.getJenisByName(name);
}

export async function getJenisIdByName(name: string) {
  const jenis = await jenisModel.getJenisByName(name);
  return jenis?.id;
}

export async function createJenis(name: string) {
  return await jenisModel.createJenis(name);
}

export async function updateJenis(id: number, name: string) {
  return await jenisModel.updateJenis(id, name);
}

export async function deleteJenis(id: number) {
  return await jenisModel.deleteJenis(id);
}
