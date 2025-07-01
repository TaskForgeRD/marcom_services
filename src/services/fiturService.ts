import * as fiturModel from '../models/fiturModel';

export async function getAllFitur() {
  return await fiturModel.getAllFitur();
}

export async function getFiturIdByName(name: string) {
  const fitur = await fiturModel.getFiturByName(name);
  return fitur?.id;
}