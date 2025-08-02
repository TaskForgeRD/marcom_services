import * as fiturModel from "../models/fiturModel";

export async function getAllFitur() {
  return await fiturModel.getAllFitur();
}

export async function getFiturById(id: number) {
  return await fiturModel.getFiturById(id);
}

export async function getFiturIdByName(name: string) {
  const fitur = await fiturModel.getFiturByName(name);
  return fitur?.id;
}

export async function createFitur(name: string) {
  return await fiturModel.createFitur(name);
}

export async function updateFitur(id: number, name: string) {
  return await fiturModel.updateFitur(id, name);
}

export async function deleteFitur(id: number) {
  return await fiturModel.deleteFitur(id);
}
